import {authenticationMethods} from "./firebaseApp.js";


//Authenticate user anonymously
export function authenticateUser() {
    console.log("Authenticating user anonymously...");
    
    authenticationMethods.onAuthStateChanged((user) => {
        if (user) {
            console.log("User is already signed in:", user.uid);    
        } else {
            console.log("No user is signed in. Signing in anonymously...");
        }
    });
    
    authenticationMethods.signInAnonymously()
        .then(() => {
            console.log("User signed in anonymously");
            
        })
        .catch((error) => {
            console.error("Error signing in anonymously:", error);
        });
}

export function getUserId() {
    const user = authenticationMethods.getUserId();
    if (user) {
        return user.uid;
    }
    return null;
}