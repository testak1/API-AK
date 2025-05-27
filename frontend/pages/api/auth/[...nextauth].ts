// pages/api/auth/[...nextauth].ts
import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import sanity from "@/lib/sanity";
import { verifyPassword } from "@/lib/auth";

export const authOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        try {
          const user = await sanity.fetch(
            `*[_type == "resellerUser" && email == $email][0]{
              email,
              password,
              resellerId
            }`,
            { email: credentials?.email },
          );

          if (!user) return null;

          const isValid = await verifyPassword(
            credentials?.password || "",
            user.password,
          );

          if (isValid) {
            return {
              id: user.email,
              email: user.email,
              resellerId: user.resellerId,
            };
          }
          return null;
        } catch (error) {
          console.error("Authentication error:", error);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async session({ session, token }) {
      session.user.resellerId = token.resellerId;
      return session;
    },
    async jwt({ token, user }) {
      if (user?.resellerId) {
        token.resellerId = user.resellerId;
      }
      return token;
    },
  },
  pages: {
    signIn: "/admin/login",
  },
};

export default NextAuth(authOptions);
