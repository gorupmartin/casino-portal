import { withAuth } from "next-auth/middleware"

export default withAuth({
    callbacks: {
        authorized: ({ token }) => !!token,
    },
})

export const config = {
    matcher: [
        // Protect everything except the login page, NextAuth endpoints, and static assets
        "/((?!api/auth|login|_next/static|_next/image|favicon.ico).*)",
    ],
}
