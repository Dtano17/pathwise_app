import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Mail, Send, CheckCircle, XCircle } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

const emailTestSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  firstName: z.string().min(1, 'First name is required').max(50),
});

type EmailTestForm = z.infer<typeof emailTestSchema>;

export default function EmailTest() {
  const [testStatus, setTestStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const form = useForm<EmailTestForm>({
    resolver: zodResolver(emailTestSchema),
    defaultValues: {
      email: 'tanarunodennis@gmail.com',
      firstName: 'Dennis',
    },
  });

  const onSubmit = async (data: EmailTestForm) => {
    try {
      setTestStatus('sending');
      setErrorMessage('');

      const res = await apiRequest('POST', '/api/test-email', data);
      const response = await res.json();

      if (response.success) {
        setTestStatus('success');
        console.log('Email sent successfully:', response);
      } else {
        setTestStatus('error');
        setErrorMessage(response.error || 'Failed to send email');
      }
    } catch (error: any) {
      setTestStatus('error');
      setErrorMessage(error.message || 'An error occurred while sending the email');
      console.error('Email test error:', error);
    }
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-2">Email Test</h1>
          <p className="text-muted-foreground">
            Test the Resend integration by sending a welcome email
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5" />
              Send Test Welcome Email
            </CardTitle>
            <CardDescription>
              This will send a welcome email using the Resend connector. You can send multiple test emails to the same address.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email Address</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="email"
                          placeholder="your-email@example.com"
                          data-testid="input-test-email"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>First Name</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="John"
                          data-testid="input-test-firstname"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  className="w-full gap-2"
                  disabled={testStatus === 'sending'}
                  data-testid="button-send-test-email"
                >
                  {testStatus === 'sending' ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Send Test Email
                    </>
                  )}
                </Button>
              </form>
            </Form>

            {testStatus === 'success' && (
              <div className="mt-4 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-lg flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-emerald-700 dark:text-emerald-400">
                    Email sent successfully!
                  </p>
                  <p className="text-sm text-emerald-600 dark:text-emerald-500 mt-1">
                    Check your inbox at {form.getValues('email')}. The email may take a few moments to arrive.
                  </p>
                </div>
              </div>
            )}

            {testStatus === 'error' && (
              <div className="mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded-lg flex items-start gap-3">
                <XCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-red-700 dark:text-red-400">
                    Failed to send email
                  </p>
                  <p className="text-sm text-red-600 dark:text-red-500 mt-1">
                    {errorMessage || 'Please check the Resend connector configuration and try again.'}
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Troubleshooting</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>
              <strong>If the email doesn't arrive:</strong>
            </p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Check your spam/junk folder</li>
              <li>Verify the Resend connector is properly configured in your workspace</li>
              <li>Ensure your Resend account has available email credits</li>
              <li>Check the server logs for error messages</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
