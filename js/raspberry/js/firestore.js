import { initializeApp, applicationDefault, cert } from 'firebase-admin/app';
import { getFirestore, Timestamp, FieldValue } from 'firebase-admin/firestore';

class firestore {
    constructor( ) {
        this.fssa = {
            "type": "service_account",
            "project_id": "napak-board",
            "private_key_id": "e01fdfdf8f2a41d7af909db55234358312bd6ccd",
            "private_key": "-----BEGIN PRIVATE KEY-----",
            "client_email": "firebase-adminsdk-2bukn@napak-board.iam.gserviceaccount.com",
            "client_id": "107554878182031135368",
            "auth_uri": "https://accounts.google.com/o/oauth2/auth",
            "token_uri": "https://oauth2.googleapis.com/token",
            "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
            "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-2bukn%40napak-board.iam.gserviceaccount.com"
          }

        /**
         * Initialize firebase
         */
        // Load firestore service account key
        initializeApp({
            credential: cert(this.fssa)
        });
    }

    initialize() {
        return getFirestore();
    }
}

export default firestore
