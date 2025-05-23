import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

const users = [
  {
    id: "4844e087-e532-492b-a67a-57f4b77f590f",
    email: "reseller1@example.com",
    password: "demo123",
    resellerId: "testreseller",
  },
];

export const authOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" },
      },
      authorize(credentials) {
        console.log("LOGIN ATTEMPT", credentials);
        const user = users.find(
          (u) =>
            u.email === credentials?.email &&
            u.password === credentials?.password,
        );
        console.log("USER FOUND", user);
        return user ?? null;
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
