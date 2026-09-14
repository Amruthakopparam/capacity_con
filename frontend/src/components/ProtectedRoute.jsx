import { Navigate } from 'react-router-dom'

function ProtectedRoute({
  user,
  allowedRole,
  children,
}) {
  // Not logged in
  if (!user) {
    return <Navigate to="/" replace />
  }

  // Wrong role
  if (
    !user.role ||
    user.role.toLowerCase() !== allowedRole.toLowerCase()
  ) {
    return <Navigate to="/" replace />
  }

  return children
}

export default ProtectedRoute