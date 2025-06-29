import { FastifyInstance } from "fastify";
import fp from "fastify-plugin";
import admin from "firebase-admin";
import { App, initializeApp } from "firebase-admin/app";
import { Auth, getAuth } from "firebase-admin/auth";
import { getStorage, Storage } from "firebase-admin/storage";

declare module "fastify" {
  interface FastifyInstance {
    firebase: App;
    firebaseAuth: Auth;
    firebaseStorage: Storage;
  }
}

async function firebasePlugin(fastify: FastifyInstance, options: any) {
  if (!fastify.hasDecorator("firebase")) {
    const firebaseApp = initializeApp({
      credential: admin.credential.cert(options.credential),
    });
    const firebaseAuth = getAuth();
    const firebaseStorage = getStorage();

    fastify.decorate("firebase", firebaseApp);
    fastify.decorate("firebaseAuth", firebaseAuth);
    fastify.decorate("firebaseStorage", firebaseStorage);
  } else {
    throw new Error("Firebase already registered");
  }
}

export default fp(firebasePlugin);
