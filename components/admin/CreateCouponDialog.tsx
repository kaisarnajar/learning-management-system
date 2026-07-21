"use client";

import { useState } from "react";
import { Dialog } from "@headlessui/react";
import { format } from "date-fns";
import { createDefaultCoupon } from "@/app/admin/coupons/actions";
import { SubmitButton } from "@/components/shared/SubmitButton";

type CourseOption = {
  id: string;
  title: string;
};

export function CreateCouponDialog({ courses }: { courses: CourseOption[] }) {
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState("");

  async function action(formData: FormData) {
    setError("");
    const result = await createDefaultCoupon(formData);
    if (result.error) {
      setError(result.error);
    } else {
      setIsOpen(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="rounded bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-light"
      >
        + Create Default Coupon
      </button>

      <Dialog open={isOpen} onClose={() => setIsOpen(false)} className="relative z-50">
        <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="mx-auto max-w-md w-full rounded bg-white p-6 shadow-xl">
            <Dialog.Title className="text-lg font-semibold text-gray-900 mb-4">
              Create Default Coupon
            </Dialog.Title>
            
            <form action={action} className="space-y-4">
              {error && <p className="text-red-600 text-sm">{error}</p>}
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Code</label>
                <input required type="text" name="code" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm" placeholder="e.g. SUMMER50" />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Discount Percentage (%)</label>
                <input required type="number" min="1" max="100" name="percentage" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm" />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Valid From</label>
                  <input required type="date" name="validFrom" defaultValue={format(new Date(), "yyyy-MM-dd")} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Valid Until</label>
                  <input required type="date" name="validUntil" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Course (Optional)</label>
                <select name="courseId" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm">
                  <option value="">All Courses</option>
                  {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Gender (Optional)</label>
                <select name="gender" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm">
                  <option value="">All Genders</option>
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                </select>
              </div>

              <input type="hidden" name="isActive" value="true" />

              <div className="mt-6 flex justify-end gap-3">
                <button type="button" onClick={() => setIsOpen(false)} className="rounded border px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
                <SubmitButton className="rounded bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-light">Create</SubmitButton>
              </div>
            </form>
          </Dialog.Panel>
        </div>
      </Dialog>
    </>
  );
}
