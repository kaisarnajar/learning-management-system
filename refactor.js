const fs = require('fs');

const files = [
  "components/admin/ToggleHomepageAnnouncementButton.tsx",
  "app/profile/notifications/page.tsx",
  "components/profile/NotificationCard.tsx",
  "components/admin/BookForm.tsx",
  "components/admin/PaymentSettingsForm.tsx",
  "components/auth/ForgotPasswordForm.tsx",
  "components/auth/LoginForm.tsx",
  "components/auth/RegisterForm.tsx",
  "components/auth/ResetPasswordForm.tsx",
  "components/bookstore/BookCheckoutClient.tsx",
  "components/contact/ContactForm.tsx",
  "components/fatwa/AskFatwaForm.tsx",
  "components/payment/EnrollmentPaymentForm.tsx",
  "components/payment/MonthlyPaymentForm.tsx"
];

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  if (content.includes('type="submit"')) {
    content = content.replace(/<button([^>]*?type="submit"[^>]*?)>([\s\S]*?)<\/button>/g, '<SubmitButton$1>$2</SubmitButton>');
    if (!content.includes('import { SubmitButton }')) {
      content = 'import { SubmitButton } from "@/components/shared/SubmitButton";\n' + content;
    }
    fs.writeFileSync(file, content);
    console.log("Updated", file);
  }
}
