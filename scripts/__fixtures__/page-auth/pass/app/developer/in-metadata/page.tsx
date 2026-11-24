import { requireDeveloper } from "@/services/auth-actions";

export async function generateMetadata() {
  await requireDeveloper();
  return { title: "Developer" };
}

const DeveloperPage = () => <p>Developer data</p>;
export default DeveloperPage;
