# New feature - implementing authorization for frontend;

## Context
We already have API for registration, login and token rotations. 
We also have registration page with form sending a request to the API;


## Task 
You must implement login page with form including email and password fields, using server actions(we can use setStransition hook to get loading information). As the result tokens must be saved in cookies (do not forget to do the same for register form, using server actions). You must use shared contracts for typing API responses in web app.
Then you should implement the proactive strategy checking access token in proxy(middleware):
if access token expires in 30 seconds or less, we should start the rotation flow with grace window set to 30 seconds (we are gonna use the single instance of the app, so it`s ok to use POJO or Map). We need api routes in order to refresh tokens from the client, using the same functionality with grace window, you should just create api routes without implementing tokens rotation on the client side, it will be done in the future when we wire up ky library.
 A client must be redirected to a route they came from after login/register (we are gonna add some protected routes in the future). 

 ## Result 
 Have the success authorization flow with login, registration and token rotation.

