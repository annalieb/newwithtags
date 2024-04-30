# newwithtags
### An image-based street fashion web app. Created in CS 304 (Spring 2024). 
Authors: Anna Lieb, Maria Yokochi Ordal, Soo Lee, and Maya Mau

## Project overview
On newwithtags, users can upload pictures of outfits and tag them by location and aesthetic. Different cities are known for different fashion trends and aesthetics, and so the website is useful for seeing current trends sorted by geographical tags and aesthetic tags. Posts are image-centric but users can add captions, aesthetic tags, and location tags when they create a new post. Additionally, other users can interact with posts by liking and commenting on posts. Users can view all posts in the home page, and can filter by tag and by city. The authorship of posts and comments is anonymous, but users must be logged in to comment and post. A newwithtags account stores user profile data including the user's email, name, posts, and liked posts. 

## How to use newwithtags
1. Clone this GitHub repository. 
2. On a Wellesley CS server account, run `node server.js` and open the given localhost address in your browser. 
3. Navigate the website: 
	1. First, you will land on the **home page** (the home route `/`). This page shows a gallery of all posts. By expanding the sort and filter section, you can choose to sort by newest or by most liked. Additionally, you can filter by city or by tag. Users can conduct searches using the text input for cities, or by clicking one of the featured city or tag buttons. 
	2. View a **single post** by clicking on the image in the gallery (uses the `post-single/:id` route). This will take you to a more detailed image of the post, where you can view comments, likes, and the image caption. Notice that if you attempt to like or comment without being signed in, *it will not work*! You will receive an error message explaining that you must log in to like or comment.
	3. **Log in** or create an account by navigating to the "login" option in the nav bar (or navigate directly to `/login`). Once you are logged in, you have unlocked full functionality of the website (ie. posting, commenting, liking, etc.). 
	4. Once you're logged in, you will be able to **create a post** by selecting "Create" from the nav bar (or navigate directly to `/create`). You will notice that you can also edit and delete your posts once you have created them. Note that the edit and delete options will not be displayed on posts that you did not create. 
	5. Now that you've created posts and liked some posts, navigate to your **profile** by selecting "My Posts" in the nav bar (you must be signed in to view your profile). First, you will see your account information and a gallery of posts that you have created (using the `/profile/posted` endpoint). Click on the "Liked" button to view a gallery of posts that you have liked (using the `/profile/liked` endpoint). Log out by clicking the "log out" button.

## Project status

### Known bugs
* Search criteria for city is very strict; the city name must be typed exactly as it is written in the database

### Future features
* "Unlike" a post by clicking on the like button for a post that you have already liked
* Implement Ajax for likes and comments
* Create system for reporting users for inappropriate conduct