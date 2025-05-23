import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import sanity from "@/lib/sanity";

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
        const users = await sanity.fetch(
          `*[_type == "resellerUser"]{email, password, resellerId}`,
        );

        const user = users.find(
          (u) =>
            u.email === credentials?.email &&
            u.password === credentials?.password,
        );

        if (user) {
          return {
            id: user.email,
            email: user.email,
            resellerId: user.resellerId,
          };
        }
        return null;
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
