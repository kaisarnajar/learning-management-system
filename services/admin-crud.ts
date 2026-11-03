import { isRedirectError } from "next/dist/client/components/redirect-error";
import { redirect } from "next/navigation";
import type { z } from "zod";
import { requireAdmin } from "@/services/auth-actions";
import { ActionError, executeServerAction } from "@/utils/action-utils";
import { withDbErrorHandling } from "@/utils/db-error";

export type AdminSession = Awaited<ReturnType<typeof requireAdmin>>;

export type ParseResult<T> = { ok: true; data: T } | { ok: false; message: string };

type Columns = Record<string, unknown>;
type Created = { id: string };
type Stop = { error: string };

/** Turns a zod `safeParse` result into a `ParseResult` carrying the first issue's message. */
export function fromSafeParse<T>(
  result: { success: true; data: T } | { success: false; error: { issues: { message: string }[] } },
  fallbackMessage = "Invalid input",
): ParseResult<T> {
  return result.success
    ? { ok: true, data: result.data }
    : { ok: false, message: result.error.issues[0]?.message ?? fallbackMessage };
}

/** Builds the `parse` step from a schema and a mapping of form fields to its input. */
export function parseFormWith<TSchema extends z.ZodType>(
  schema: TSchema,
  toInput: (formData: FormData) => unknown,
  fallbackMessage?: string,
) {
  return (formData: FormData): ParseResult<z.output<TSchema>> =>
    fromSafeParse(schema.safeParse(toInput(formData)), fallbackMessage);
}

export type CreateContext<TData> = { session: AdminSession; formData: FormData; data: TData };
export type UpdateContext<TData, TRecord> = CreateContext<TData> & { id: string; existing: TRecord };

export type AdminCrudConfig<TData, TRecord> = {
  /** Noun used in server logs ("library item"). */
  label?: string;
  /**
   * Record adapter. `find` loads the row an update/delete works on (include relations the hooks
   * need); `create`/`update`/`remove` are the default writes, replaceable through hooks. Every
   * call is wrapped in `withDbErrorHandling`.
   */
  model: {
    find: (id: string) => Promise<TRecord | null>;
    create?: (data: Columns) => Promise<Created>;
    update?: (id: string, data: Columns) => Promise<unknown>;
    remove?: (id: string) => Promise<unknown>;
  };
  /** Required for `create` and `update`; a module that only deletes may omit it. */
  parse?: (formData: FormData) => ParseResult<TData>;
  paths: {
    /** The admin list page; success flags and not-found errors are reported on it. */
    list: string;
    /** Where create-form errors go. Defaults to `${list}/new`. */
    newForm?: string;
    /** Where update-form errors go. Defaults to `${list}/${id}/edit`. */
    editForm?: (id: string) => string;
    /** Where a successful update lands. Defaults to the list with the "saved" flag. */
    afterUpdate?: (id: string) => string;
    /** Cache invalidation after a successful write. `id` is set for update and delete. */
    revalidate: (id: string | undefined, operation: "create" | "update" | "delete") => void;
  };
  /**
   * How a user-facing failure is reported: `query` redirects with `?error=<message>`;
   * `flash` throws an `ActionError` inside `executeServerAction`, which redirects with the
   * flash conventions of `utils/flash.ts`.
   */
  errorStyle?: "query" | "flash";
  /** Message for a missing record (`flash` style errors and `removeById`). */
  notFoundMessage?: string;
  /** Query flag names set on the success redirects. */
  flags?: { created?: string; updated?: string; deleted?: string };
  /** `query` style only: catch unexpected exceptions and redirect with this message. */
  unexpectedErrorMessage?: string;
  /** `removeById` only: report a failed delete as `{ error }` instead of throwing. */
  deleteFailedMessage?: string;
  hooks?: {
    /** Maps the parsed data to columns. Defaults to the data itself. */
    toColumns?: (data: TData) => Columns;
    /** Before the create write: return `{ error }` to stop, or `{ columns }` merged over the base columns. */
    prepareCreate?: (ctx: CreateContext<TData>) => Promise<Stop | { columns?: Columns } | void>;
    /** Replaces `model.create` (slug generation, uploads with cleanup). */
    writeCreate?: (ctx: CreateContext<TData>, columns: Columns) => Promise<Created>;
    /** After the create write; `{ error }` stops with that message. */
    afterCreate?: (ctx: CreateContext<TData>, record: Created, columns: Columns) => Promise<Stop | void>;
    prepareUpdate?: (ctx: UpdateContext<TData, TRecord>) => Promise<Stop | { columns?: Columns } | void>;
    /** Replaces `model.update`. */
    writeUpdate?: (ctx: UpdateContext<TData, TRecord>, columns: Columns) => Promise<unknown>;
    /** After the update write; may stop with `{ error }` or choose the redirect target. */
    afterUpdate?: (ctx: UpdateContext<TData, TRecord>, columns: Columns) => Promise<Stop | { redirectTo?: string } | void>;
    /** Before the row is deleted (remove stored files). */
    beforeDelete?: (existing: TRecord) => Promise<void>;
  };
};

function isStop(value: unknown): value is Stop {
  return typeof value === "object" && value !== null && "error" in value;
}

/**
 * Create/update/delete server actions for an admin content module: admin check, form parsing,
 * not-found handling, hook points for uploads and featured-slot rules, cache invalidation and
 * the redirect (with the module's flash/query conventions).
 */
export function createAdminCrudActions<TData, TRecord>(config: AdminCrudConfig<TData, TRecord>) {
  const { model, parse, paths, hooks = {} } = config;
  const style = config.errorStyle ?? "query";
  const label = config.label ?? "record";
  const flags = { created: "posted", updated: "saved", deleted: "deleted", ...config.flags };
  const newForm = paths.newForm ?? `${paths.list}/new`;
  const editForm = paths.editForm ?? ((id: string) => `${paths.list}/${id}/edit`);

  const db = <T>(operation: () => Promise<T>) => withDbErrorHandling(operation, "Database operation failed");
  const baseColumns = (data: TData): Columns =>
    hooks.toColumns ? hooks.toColumns(data) : (data as unknown as Columns);

  function parseForm(formData: FormData): ParseResult<TData> {
    if (!parse) throw new Error(`No form parser configured for ${label}`);
    return parse(formData);
  }

  function fail(path: string, message: string): never {
    if (style === "flash") throw new ActionError(message);
    redirect(`${path}?error=${encodeURIComponent(message)}`);
  }

  function notFound(): never {
    if (style === "flash") throw new ActionError(config.notFoundMessage ?? "Record not found.");
    redirect(`${paths.list}?error=notfound`);
  }

  /** Runs an action body under the module's failure convention. */
  async function guarded<T>(errorPath: string, verb: string, run: () => Promise<T>): Promise<T> {
    if (style === "flash") {
      return executeServerAction(run, errorPath, `${verb} ${label}`);
    }
    const message = config.unexpectedErrorMessage;
    if (!message) return run();
    try {
      return await run();
    } catch (error) {
      if (isRedirectError(error)) throw error;
      console.error(`Database error ${verb} ${label}:`, error);
      redirect(`${errorPath}?error=${encodeURIComponent(message)}`);
    }
  }

  async function create(formData: FormData): Promise<never> {
    return guarded(newForm, "creating", async () => {
      const session = await requireAdmin();
      const parsed = parseForm(formData);
      if (!parsed.ok) fail(newForm, parsed.message);

      const ctx: CreateContext<TData> = { session, formData, data: parsed.data };
      const prepared = await hooks.prepareCreate?.(ctx);
      if (isStop(prepared)) fail(newForm, prepared.error);
      const columns = { ...baseColumns(parsed.data), ...prepared?.columns };

      const record = hooks.writeCreate
        ? await hooks.writeCreate(ctx, columns)
        : await db(() => model.create!(columns));

      const after = await hooks.afterCreate?.(ctx, record, columns);
      if (isStop(after)) fail(newForm, after.error);

      paths.revalidate(undefined, "create");
      redirect(`${paths.list}?${flags.created}=1`);
    });
  }

  async function update(id: string, formData: FormData): Promise<never> {
    return guarded(editForm(id), "updating", async () => {
      const session = await requireAdmin();
      const parsed = parseForm(formData);
      if (!parsed.ok) fail(editForm(id), parsed.message);

      const existing = await db(() => model.find(id));
      if (!existing) notFound();

      const ctx: UpdateContext<TData, TRecord> = { session, formData, data: parsed.data, id, existing };
      const prepared = await hooks.prepareUpdate?.(ctx);
      if (isStop(prepared)) fail(editForm(id), prepared.error);
      const columns = { ...baseColumns(parsed.data), ...prepared?.columns };

      if (hooks.writeUpdate) {
        await hooks.writeUpdate(ctx, columns);
      } else {
        await db(() => model.update!(id, columns));
      }

      const after = await hooks.afterUpdate?.(ctx, columns);
      if (isStop(after)) fail(editForm(id), after.error);

      paths.revalidate(id, "update");
      redirect(after?.redirectTo ?? paths.afterUpdate?.(id) ?? `${paths.list}?${flags.updated}=1`);
    });
  }

  /** Deletes a record and reports a missing one (or a failed delete) as `{ error }`. */
  async function removeById(id: string): Promise<{ error?: string }> {
    await requireAdmin();

    const existing = await db(() => model.find(id));
    if (!existing) {
      return { error: config.notFoundMessage ?? "Record not found." };
    }

    const removeRecord = async () => {
      await hooks.beforeDelete?.(existing);
      await db(() => model.remove!(id));
    };
    if (config.deleteFailedMessage) {
      try {
        await removeRecord();
      } catch (error) {
        if (isRedirectError(error)) throw error;
        console.error(`Failed to delete ${label}:`, error);
        return { error: config.deleteFailedMessage };
      }
    } else {
      await removeRecord();
    }

    paths.revalidate(id, "delete");
    return {};
  }

  /** Deletes a record and redirects to the list (`?error=notfound` when it no longer exists). */
  async function remove(id: string): Promise<never> {
    return guarded(paths.list, "deleting", async () => {
      const result = await removeById(id);
      if (result.error) notFound();
      redirect(`${paths.list}?${flags.deleted}=1`);
    });
  }

  return { create, update, remove, removeById };
}
