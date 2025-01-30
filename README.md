# NapakBoard
NapakBoard is mobile app to store your home wall routes. It can also be used to control leds if you have those installed.

You need to create an firebase project at https://firebase.google.com/
and don´t worry - it´s free.


Firebase
------------------------------------

1. Create new firebase project
2. Add Firebase to your web app
3. Copy auth information and update those into `/js/shared/user.js`
  Should look like this;

            // Your web app's Firebase configuration
            const firebaseConfig = {
                apiKey: "Your api key here",
                authDomain: "projectname.firebaseapp.com",
                projectId: "projectname",
                storageBucket: "projectname.firebasestorage.app",
                messagingSenderId: "123456784901",
                appId: "x:abcdefghijkl:web:842e83b220c83ccaaa9axx"
            };


4. Enable Firestore
5. Create database
6. Update database rules;

        rules_version = '2';
        service cloud.firestore {
            match /databases/{database}/documents {
                match /{document=**} {
                allow read: if request.auth != null;
                allow write: if request.auth != null
                }
            }
        }
    

7. Enable Authentication 
8. Enable Email/Password 

*Firebase is now ready!*




Web app
------------------------------------
1. Launch it however you like. I use `python3 -h http.server`
2. Open your browser and head to localhost:8000
    (This app is meant to be used with mobile devices so I strongly recommend to use responsive design mode and resolutions like 375x812px)
3. Create an account
    3.1. The app will log you in automatically 

You should now see systembaord that is 18 units tall and 11 units wide (the size of strandard moonboard) with no holds.

In project root folder there is `hold_setup.json` file. Open that and change your board dimensions to correct values. If your board has adjustable angle, change `"adjustable"` to `true`

    {
    	"characteristics": {
    		"height": 18,
    		"width": 11,
    		"adjustable": false
    	}
    }
    

There is also `hold_setup_example.json` where you can see how to add holds - but for that there is also setup page with gui so I strongly urge you to use that.

After changing the correct values refresh your browser and double check if it looks right. If and when everything is ok head to `http://localhost:8000/?setup`

In here you can start adding holds by tapping the "cell", like A18. For each hold you can change following parameters;
- Rotation
- X Offset
- Y Offset
- Scale X
- Scale Y
- Color 

You don´t have to do the whole setup right away, you can always save it and come back later to add new holds. Remember to `SAVE`!

***TIP*** There is button that has a label `console` on the bottom navi. That outputs the current setup in browsers console. You can copy that object and paste it to `hold_setup.json` and you have a backup of your setup should something go wrong.

Now you are good to go and start adding routes and tick climbed ones.
Just navigate back to `localhost:8000/` <3

One more thing! You can change your username from bottom navi. Tap `→` and off the canvas menu opens. Tap `PROFILE` button and change your name to whatever. This name is shown in the route listing and has no other use but is nice if you have multiple users on your board.
