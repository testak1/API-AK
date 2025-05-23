import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

const users = [
  { email: "reseller1@example.com", password: "demo123", resellerId: "testreseller" },
];

export const authOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" },
      },
      authorize(credentials) {
        const user = users.find(
          (u) => u.email === credentials?.email && u.password === credentials?.password
        );
        return user || null;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) token.resellerId = user.resellerId;
      return token;
    },
    async session({ session, token }) {
      session.user.resellerId = token.resellerId;
      return session;
    },
  },
  pages: {
    signIn: "/admin/login",
  },
};

export default NextAuth(authOptions);