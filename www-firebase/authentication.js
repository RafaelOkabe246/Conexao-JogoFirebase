import {authenticationMethods} from "./firebaseApp.js";


//Authenticate user anonymously
export async function authenticateUser() {
    console.log("Authenticating user anonymously...");

    const currentUser = authenticationMethods.getUserId();
    if (currentUser?.uid) {
        console.log("User is already signed in:", currentUser.uid);
        return currentUser.uid;
    }

    return new Promise((resolve, reject) => {
        const unsubscribe = authenticationMethods.onAuthStateChanged((user) => {
            if (user) {
                unsubscribe();
                console.log("User is signed in:", user.uid);
                resolve(user.uid);
                return;
            }

            console.log("No user is signed in. Signing in anonymously...");
        });

        authenticationMethods.signInAnonymously()
            .then(() => {
                console.log("Anonymous sign-in request sent");
            })
            .catch((error) => {
                console.error("Error signing in anonymously:", error);
                unsubscribe();
                reject(error);
            });
    });
}

export async function waitForUserId() {
    const currentUser = authenticationMethods.getUserId();
    if (currentUser?.uid) {
        return currentUser.uid;
    }

    return new Promise((resolve) => {
        const unsubscribe = authenticationMethods.onAuthStateChanged((user) => {
            if (user?.uid) {
                unsubscribe();
                resolve(user.uid);
            }
        });
    });
}

export function getUserId() {
    const user = authenticationMethods.getUserId();
    if (user) {
        return user.uid;
    }
    return null;
}