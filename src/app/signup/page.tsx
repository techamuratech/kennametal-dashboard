// This file should be deleted or renamed to prevent access
export default function SignupDisabled() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          Registration Disabled
        </h2>
        <p className="text-gray-600 mb-6">
          New user registration is handled by administrators only.
        </p>
        <a href="/login" className="text-primary-600 hover:text-primary-700">
          Go to Login
        </a>
      </div>
    </div>
  );
}
