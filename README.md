# napakboard
Led climbing wall

# Setting up the front end
1. Clone this repo

2.
    a. Create a new Firebase project at https://firebase.google.com/
    
    b. You need firestore and authentication. 

3. Now find page_board.js file under js/templates. In here change your board size where it says `let mySystemBoard = new systemBoard({width: 11, height: 21});`

4. Edit your board layout;  In the root there is a file called hold_setup.json. In here you can place whatever holds you have placed on your board.
   If you wish you can just go with placeholder images for holds. Then only thing you have to do is to add all your holds like this;

```
   "a1": {"holdColor": "#000"},
   "b1": {"holdColor": "#fff"},
   "c1": {"holdColor": "#00f"},
   "d1": {"holdColor": "#f00"},
   "e1": {"holdColor": "#00f"} etc...
``` 
   You can also use hold images, needs to be and SVG 32x32px of size. There is some ready made hold images under images/holds.svg, check this so you can see how that works.
   Use them like this;
   `"f12": {"holdColor": "#fff", "hold" : "moon-99", "rotation": 25, "boltPlacement": [0, -10]},`
   
   Also rotation and bolt placement can be changed in here as seen above. But those are optional like everything else.

5. Update your firebase config from `js/shared/user.js`

6. Launch it locally with python for example; `python -m SimpleHTTPServer`

7. Host it somewhere. I used netlify; https://kiinto.netlify.app/projects/napakboard 
