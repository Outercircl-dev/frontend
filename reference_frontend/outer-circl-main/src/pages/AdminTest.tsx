import { TestPostActivityMessages } from "@/components/admin/TestPostActivityMessages";

const AdminTest = () => {
  return (
    <div className="container max-w-4xl mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-6">Email Integration Testing</h1>
      <p className="text-muted-foreground mb-8">
        Test your MailerSend integration and verify domain configuration.
      </p>
      <TestPostActivityMessages />
    </div>
  );
};

export default AdminTest;
