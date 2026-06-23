const fs = require('fs');

const files = [
  "components/admin/PaymentSettingsForm.tsx",
  "components/auth/ForgotPasswordForm.tsx",
  "components/auth/LoginForm.tsx",
  "components/auth/RegisterForm.tsx",
  "components/auth/ResetPasswordForm.tsx",
  "components/bookstore/BookCheckoutClient.tsx",
  "components/payment/EnrollmentPaymentForm.tsx",
  "components/payment/MonthlyPaymentForm.tsx"
];

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  let changed = false;

  // Add early bailout
  if (content.includes('async function handleSubmit') && !content.includes('if (loading) return;')) {
    content = content.replace(/(async function handleSubmit[^\{]+\{\s*e\.preventDefault\(\);\s*)/g, '$1if (loading) return;\n    ');
    changed = true;
  }

  // Pass isSubmitting to SubmitButton
  if (content.includes('<SubmitButton') && !content.includes('isSubmitting={loading}')) {
    content = content.replace(/<SubmitButton/g, '<SubmitButton isSubmitting={loading}');
    changed = true;
  }

  if (changed) {
    fs.writeFileSync(file, content);
    console.log("Updated", file);
  }
}
