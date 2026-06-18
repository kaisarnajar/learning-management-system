# agent.md

## Agent Instructions

Before performing any task, review and follow all instructions defined in the `.agents/` directory.

### Required Behavior

1. **Read all applicable files** inside `.agents/` based on the task being performed (e.g., UI, backend, database, architecture, testing, deployment) before making changes.

2. **Treat instructions in `.agents/` as the project's source of truth** for:
   * Coding standards
   * Architecture patterns
   * UI/UX conventions
   * Theme usage
   * Database access patterns
   * Error handling
   * Testing requirements
   * Naming conventions
   * Project-specific workflows

3. Ensure all generated code complies with the rules defined in `.agents/`.

4. **Reuse existing patterns and components** whenever possible. Review existing implementations before creating new ones.

5. Avoid introducing new conventions if an existing project convention already exists.

6. **Maintain consistency** with the current codebase, preferring the established architecture, design system, naming conventions, and development practices over introducing new paradigms.

7. **Apply comprehensively**: If multiple instruction files apply to the task at hand, ensure all relevant rules are followed simultaneously.

8. **Preserve existing functionality** and avoid introducing regressions when modifying current implementations. Understand the current logic first, then apply changes that align with the established patterns.

### Priority Order

1. Instructions in `.agents/`
2. Existing codebase conventions
3. General framework best practices

### Goal

All future code, refactoring, bug fixes, documentation, and feature development should remain fully consistent with the standards and conventions defined within the `.agents/` directory.
