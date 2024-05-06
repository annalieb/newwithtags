const path = require('path');
require("dotenv").config({ path: path.join(process.env.HOME, '.cs304env')});
const { Connection } = require('./connection');
const cs304 = require('./cs304');

const mongoUri = cs304.getMongoUri();
const bcrypt = require('bcrypt');
const ROUNDS = 15;

const DBname = "newwithtags";
const POSTS = "posts";
const USERS = "users";
const LIKES = "likes";

/**
 * Lists all documents from the specified collection in the specified database.
 * @param {database} db 
 * @param {collection}} collection 
 * @returns 
 */
async function findDocuments(db, collection) {
  documents = await db.collection(collection).find({}).toArray();
  return documents;
}

/**
 * Inserts document(s) into the specified collection of newwithtags
 * @param {database} db
 * @param {list} ls
 * @return true if successfully inserted, false otherwise
 */
async function insertDocuments(db, collection, ls) {
  await db.collection(collection).insertMany(ls);

  // test to see if we successfully inserted post(s)
  let findInsertedDocuments = await findDocuments(db, collection);
  if (findInsertedDocuments.length == 0) {
    return false;
  } else {
    return true;
  }
}

/**
 * Deletes all documents from a collection
 * @param {database} db 
 * @param {collection} collection
 * @returns true if everything is deleted from collection, false otherwise
 */
async function deleteDocuments(db, collection) {
  await db.collection(collection).deleteMany({});
  
  let findDeletedPosts = await findDocuments(db, collection);

  if (findDeletedPosts.length == 0) {
    return true;
  } else {
    return false;
  }
}

/**
 * Main function to call the functions
 */
async function main() {
  const myDB = await Connection.open(mongoUri, DBname);

  // sample posts
  const post1 = {
    postID: 20001,
    userID: 'mo104',
    imageURL: "../assets/uploads/img1.jpeg",
    comments: [
        {text: "I love this city!!", 
        userID: "mo104", 
        date: "2023-12-20 3:55:43"}, 
        {text: "Love your coat!", 
        userID: "mm124", 
        date: "2023-12-20 4:30:52"}
    ], 
    tags: [
        "city", 
        "colorblocking",
        "green"
    ],
    city: "paris",
    date: "2023-12-10 3:26:23",
    caption: "new city!!",
    alttext: "A person walking down the street in a long green coat."
  };

  const post2 = {
    postID: 20002,
    userID: 'mm124',
    imageURL: "../assets/uploads/img2.png",
    comments: [
        {text: "beautiful", 
        userID: "mo104", 
        date: "2023-12-20 3:55:43"}, 
        {text: "Love your coat!", 
        userID: "mm124", 
        date: "2023-12-20 4:30:52"},
        {text: "hey gurl", 
        userID: "sl120", 
        date: "2023-12-20 4:30:52"},
        {text: "Love your coat!", 
        userID: "al117", 
        date: "2023-12-20 4:18:56"},
        {text: "hi!", 
        userID: "mm124", 
        date: "2023-12-20 4:30:52"},
        {text: "cuteeeeee!", 
        userID: "mo104", 
        date: "2023-12-20 4:24:52"}
    ], 
    tags: [
        "businesscasual", 
        "city",
        "corporate",
        "trenchcoat"
    ],
    city: "paris",
    date: "2023-12-20 3:26:23",
    caption: "check out my new coat!",
    alttext: "A person walking down the street in Paris in a long black trench coat."
  };

  const post3 = {
    postID: 20003,
    userID: 'sl120',
    imageURL: "../assets/uploads/img3.png",
    comments: [
        {text: "this is so cool", 
        userID: "mo104", 
        date: "2023-12-20 3:55:43"}, 
    ], 
    tags: [
        "sambas", 
        "trenchcoat",
        "city",
        "casual"
    ],
    city: "paris",
    date: "2024-01-30 3:26:23",
    caption: "saw this person in paris and thought their coat was so cool!!",
    alttext: "A person walking down the street in a long tan coat carrying a large beige shoulder bag."
  };

  const post4 = {
    postID: 20004,
    userID: 'sl120',
    imageURL: "../assets/uploads/img4.png",
    comments: [
        {text: "omg nice skirt!", 
        userID: "mo104", 
        date: "2023-12-20 3:55:43"}, 
        {text: "wow love the heels!", 
        userID: "mm124", 
        date: "2022-12-20 3:55:43"}
    ], 
    tags: [
        "red", 
        "colorblocking",
        "parisian",
        "stripes"
    ],
    city: "paris",
    date: "2023-11-30 3:26:23",
    caption: "this skirt is so cool!",
    alttext: "A person walking down the street in Paris in a calf-length red and black striped skirt, black hoodie, and large black Chanel shoulder bag."
  };

  const post5 = {
    postID: 20005,
    userID: 'mo104',
    imageURL: "../assets/uploads/img5.png",
    comments: [
        {text: "that's such a cool bag", 
        userID: "mo104", 
        date: "2023-12-20 3:55:43"}, 
        {text: "love a pop of color", 
        userID: "sl120", 
        date: "2023-12-31 3:55:43"}
    ], 
    tags: [
        "red", 
        "colorpop",
        "trenchcoat",
        "sneakers"
    ],
    city: "paris",
    date: "2023-12-30 3:26:23",
    caption: "my favorite type of outfit is all black with a pop of red",
    alttext: "A person walking down the street in a long tan coat carrying a large beige shoulder bag."
  };

  const post6 = {
    postID: 20006,
    userID: 'sl120',
    imageURL: "../assets/uploads/img6.png",
    comments: [
        {text: "that's such a cool bag", 
        userID: "mo104", 
        date: "2023-12-20 3:55:43"}, 
        {text: "the best kind of casual fit", 
        userID: "sl120", 
        date: "2023-02-20 3:55:43"}
    ], 
    tags: [
        "slides", 
        "blackandwhite",
        "spring"
    ],
    city: "paris",
    date: "2023-10-30 3:26:23",
    caption: "the flowers are so cute!!",
    alttext: "A person walking down the street in a short navy coat and white pants carrying two bouquets of flowers and a woven shoulder bag."
  };

  const post7 = {
    postID: 20007,
    userID: 'mm124',
    imageURL: "../assets/uploads/img7.jpeg",
    comments: [
        {text: "omg i NEED an oversized denim jacket", 
        userID: "mo104", 
        date: "2023-12-20 3:55:43"}, 
        {text: "Love the low bun with a cap", 
        userID: "sl120", 
        date: "2023-12-20 3:55:43"}
    ], 
    tags: [
        "baseballcap", 
        "casual",
        "streetwear",
        "goldenhour"
    ],
    city: "beijing",
    date: "2023-12-30 3:26:23",
    caption: "casual fit for today",
    alttext: "A person looking away from the camera in an oversized denim jacket, white t-shirt, black pants, and a black baseball cap facing forward."
  };

  const post8 = {
    postID: 20008,
    userID: 'sl120',
    imageURL: "../assets/uploads/img8.png",
    comments: [
        {text: "such cool colors!", 
        userID: "mo104", 
        date: "2023-12-20 3:55:43"}, 
        {text: "absolutely serving", 
        userID: "mm124", 
        date: "2023-12-20 3:55:43"}
    ], 
    tags: [
        "european", 
        "colorblocking",
        "crochet",
        "summer"
    ],
    city: "normandy",
    date: "2023-12-30 3:26:23",
    caption: "posed in a red doorway!",
    alttext: "A person posing with their arm up in a red doorframe wearing a white crochet top and denim shorts."
  };

  const post9 = {
    postID: 20009,
    userID: 'al117',
    imageURL: "../assets/uploads/img9.jpeg",
    comments: [
        {text: "such cool colors!", 
        userID: "mo104", 
        date: "2023-12-20 3:55:43"}, 
        {text: "so cool!!", 
        userID: "sl120", 
        date: "2023-12-20 3:55:43"},
        {text: "love", 
        userID: "mm124", 
        date: "2023-12-20 3:55:43"},
        {text: "so cool omg", 
        userID: "mm124", 
        date: "2023-12-20 3:55:43"}
    ], 
    tags: [
        "casual", 
        "nordic",
        "baseballcap",
        "colorpop"
    ],
    city: "new york city",
    date: "2023-12-30 3:26:23",
    caption: "felt like being comfy today",
    alttext: "A person by a street crossing holding a neon green purse and wearing a green baseball cap, cream fleece vest, and jeans."
  };

  const post10 = {
    postID: 20010,
    userID: 'mo104',
    imageURL: "../assets/uploads/img10.png",
    comments: [
        {text: "this is so european", 
        userID: "mo104", 
        date: "2023-12-20 3:55:43"}, 
        {text: "so cool!!", 
        userID: "sl120", 
        date: "2023-12-20 3:55:43"},
        {text: "so beautiful", 
        userID: "mm124", 
        date: "2023-12-20 3:55:43"},
        {text: "I so want to be there!", 
        userID: "al117", 
        date: "2023-12-20 3:55:43"}
    ], 
    tags: [
        "european", 
        "casual",
        "longskirt",
        "maryjanes"
    ],
    city: "normandy",
    date: "2023-12-30 3:26:23",
    caption: "this was so beautiful!",
    alttext: "A person with their back facing the camera in a long grey skirt and loose black top."
  };

  const post11 = {
    postID: 20011,
    userID: 'mo104',
    imageURL: "../assets/uploads/img11.png",
    comments: [
        {text: "the lighting is so gorgeous!", 
        userID: "mm124", 
        date: "2023-12-20 3:55:43"}, 
        {text: "love the color coordination", 
        userID: "mm124", 
        date: "2023-12-20 3:55:43"},
        {text: "so beautiful", 
        userID: "al117", 
        date: "2023-12-20 3:55:43"},
        {text: "gorgeous!!", 
        userID: "mm124", 
        date: "2023-12-20 3:55:43"}
    ], 
    tags: [
        "casual",
        "longskirt"
    ],
    city: "wellesley",
    date: "2024-04-10 3:26:23",
    caption: "felt casual today!",
    alttext: "Two people next to each other facing the camera, both wearing white tops. One has tan pants while the other has black pants."
  };

  const post12 = {
    postID: 20012,
    userID: 'sl120',
    imageURL: "../assets/uploads/img12.png",
    comments: [
        {text: "this skirt is SO COOL", 
        userID: "mm124", 
        date: "2023-12-20 3:55:43"}, 
        {text: "love the color coordination", 
        userID: "mo104", 
        date: "2023-12-20 3:55:43"},
        {text: "so cool", 
        userID: "al117", 
        date: "2023-12-20 3:55:43"},
        {text: "gorgeous!!", 
        userID: "mm124", 
        date: "2023-12-20 3:55:43"}
    ], 
    tags: [
        "legwarmers",
        "athleisure"
    ],
    city: "madrid",
    date: "2024-04-28 10:25:27",
    caption: "this city was so cute!",
    alttext: "A person posing in front of a tan building wearing a black adidas zip-up jacket, black leg warmers, and a grey skirt and top with white sneakers."
  };

  const post13 = {
    postID: 20013,
    userID: 'mo104',
    imageURL: "../assets/uploads/img13.png",
    comments: [
        {text: "gorgeous", 
        userID: "mm124", 
        date: "2023-12-20 3:55:43"}, 
        {text: "museum pics are so cute", 
        userID: "mo104", 
        date: "2023-12-20 3:55:43"},
        {text: "omg love!!", 
        userID: "al117", 
        date: "2023-12-20 3:55:43"},
        {text: "gorgeous!!", 
        userID: "sl120", 
        date: "2026-12-20 3:55:43"}
    ], 
    tags: [
        "coquette",
        "bows"
    ],
    city: "new york city",
    date: "2024-04-09 10:25:27",
    caption: "went to a museum to take pics",
    alttext: "A person in a museum holding a bouquet of pink flowers, with a pink shoulder bag and white cardigan with a short black skirt."
  };

  const post14 = {
    postID: 20014,
    userID: 'mo104',
    imageURL: "../assets/uploads/img14.png",
    comments: [
        {text: "u look so gorgeous omg", 
        userID: "mm124", 
        date: "2023-12-20 3:55:43"}, 
        {text: "absolutely serving once more", 
        userID: "mo104", 
        date: "2023-12-20 3:55:43"},
        {text: "every day is a good day when u post", 
        userID: "al117", 
        date: "2023-12-20 3:55:43"},
        {text: "stunning", 
        userID: "sl120", 
        date: "2026-12-20 3:55:43"}
    ], 
    tags: [
        "red",
        "longskirt",
        "maryjanes"
    ],
    city: "new york city",
    date: "2024-04-09 10:25:27",
    caption: "sitting on a bench",
    alttext: "A person sitting on a stone bench wearing a black off-the-shoulder top, long black skirt, black stockings, and red mary janes."
  };

  const post15 = {
    postID: 20015,
    userID: 'mm124',
    imageURL: "../assets/uploads/img15.png",
    comments: [
        {text: "this picture is so aesthetic", 
        userID: "mo104", 
        date: "2023-12-20 3:55:43"}, 
        {text: "gorgeous", 
        userID: "mo104", 
        date: "2023-12-20 3:55:43"},
        {text: "stunning", 
        userID: "sl120", 
        date: "2026-12-20 3:55:43"},
        {text: "absolutely gorgeous", 
        userID: "al117", 
        date: "2026-12-20 3:55:43"},
        {text: "wow where is ur dress from??", 
        userID: "mm124", 
        date: "2026-12-20 3:55:43"},
        {text: "so cool", 
        userID: "mm124", 
        date: "2026-12-20 3:55:43"}
    ], 
    tags: [
        "cottagecore",
        "picnic",
        "nature"
    ],
    city: "normandy",
    date: "2024-03-20 10:25:27",
    caption: "visited christian dior's home!",
    alttext: "A person sitting at a table with a plate of mostly-finished food in front of them, wearing a tan patterned short dress."
  };

  const post16 = {
    postID: 20016,
    userID: 'sl120',
    imageURL: "../assets/uploads/img16.png",
    comments: [
        {text: "love the red", 
        userID: "mm124", 
        date: "2023-12-20 3:55:43"}, 
        {text: "gorgeous", 
        userID: "mo104", 
        date: "2023-12-20 3:55:43"},
        {text: "omg the scarf is so lovely", 
        userID: "sl120", 
        date: "2023-12-30 3:55:43"}
    ], 
    tags: [
        "red",
        "popofcolor",
    ],
    city: "beijing",
    date: "2024-04-09 10:25:27",
    caption: "forbidden city!!",
    alttext: "A person sitting on a bench in front of a red column wearing a red scarf and white dress."
  };

  const post17 = {
    postID: 20017,
    userID: 'al117',
    imageURL: "../assets/uploads/img17.png",
    comments: [
        {text: "u look so cool", 
        userID: "sl120", 
        date: "2023-12-20 3:55:43"}, 
        {text: "wow jaw dropped", 
        userID: "mo104", 
        date: "2023-12-20 3:55:43"},
        {text: "that door is really cool", 
        userID: "mm124", 
        date: "2023-12-30 3:55:43"}
    ], 
    tags: [
        "red",
        "elegant",
    ],
    city: "beijing",
    date: "2024-04-12 10:25:27",
    caption: "leaning casually against the door",
    alttext: "A person leaning against a red door wearing a white layered dress and large pendant necklace."
  };

  const post18 = {
    postID: 20018,
    userID: 'al117',
    imageURL: "../assets/uploads/img18.png",
    comments: [
        {text: "spring has sprung!", 
        userID: "mm124", 
        date: "2023-12-20 3:55:43"}, 
        {text: "the flowers are gorgeous", 
        userID: "mo104", 
        date: "2023-12-20 3:55:43"},
        {text: "such cute and casual fits!", 
        userID: "sl120", 
        date: "2023-12-30 3:55:43"}
    ], 
    tags: [
        "nature",
        "casual",
        "jorts"
    ],
    city: "wellesley",
    date: "2024-04-12 10:25:27",
    caption: "marmon fits!!",
    alttext: "Two people walking away from the camera, one wearing a denim jacket and the other wearing a football shirt with jean shorts."
  };

  const post19 = {
    postID: 20019,
    userID: 'mm124',
    imageURL: "../assets/uploads/img19.png",
    comments: [
        {text: "ur so cool", 
        userID: "mo104", 
        date: "2023-12-20 3:55:43"}, 
        {text: "you match the background so well", 
        userID: "sl120", 
        date: "2023-12-20 3:55:43"}
    ], 
    tags: [
        "streetwear",
        "casual",
        "dickies",
        "cropped"
    ],
    city: "los angeles",
    date: "2024-03-28 10:25:27",
    caption: "caught off guard",
    alttext: "A person sitting on a stool by a table indoors wearing a black cropped shirt, sunglasses, black dickies pants, and white sneakers."
  };

  const post20 = {
    postID: 20020,
    userID: 'sl120',
    imageURL: "../assets/uploads/img20.png",
    comments: [
        {text: "love this outfit", 
        userID: "mm124", 
        date: "2023-12-20 3:55:43"}, 
        {text: "so cute!!", 
        userID: "mo104", 
        date: "2023-12-20 3:55:43"},
        {text: "ate", 
        userID: "al117", 
        date: "2023-12-20 3:55:43"}
    ], 
    tags: [
        "streetwear",
        "acubi"
    ],
    city: "boston",
    date: "2023-05-15 10:25:27",
    caption: "boston public library!",
    alttext: "A person standing next to a building wearing a black dress over black jeans and a white front-tie lacy top."
  };

  const post21 = {
    postID: 20021,
    userID: 'sl120',
    imageURL: "../assets/uploads/img21.png",
    comments: [
        {text: "ur sunglasses are so cute", 
        userID: "mm124", 
        date: "2023-12-20 3:55:43"}, 
        {text: "spring vibes", 
        userID: "mo104", 
        date: "2023-12-20 3:55:43"},
        {text: "beautiful omg", 
        userID: "al117", 
        date: "2023-12-20 3:55:43"}
    ], 
    tags: [
        "y2k",
        "cropped"
    ],
    city: "madrid",
    date: "2023-08-15 10:25:27",
    caption: "loved this fit for spain!",
    alttext: "A person standing in front of many stone columns wearing a long grey skrit, blue bustier top, and white cropped cardigan."
  };

  const post22 = {
    postID: 20022,
    userID: 'sl120',
    imageURL: "../assets/uploads/img22.png",
    comments: [
        {text: "dog is so cute!!", 
        userID: "mm124", 
        date: "2023-12-20 3:55:43"}, 
        {text: "this looks so comfy", 
        userID: "mo104", 
        date: "2023-12-20 3:55:43"},
        {text: "what beautiful trees", 
        userID: "mo104", 
        date: "2023-12-20 3:55:43"}
    ], 
    tags: [
        "nature",
        "outdoors",
        "athleisure"
    ],
    city: "new york city",
    date: "2023-12-15 10:25:27",
    caption: "out on a quick walk!",
    alttext: "A person with their back facing the camera walking a dog in a white vest, white shirt, and black shorts."
  };

  const post23 = {
    postID: 20023,
    userID: 'mm124',
    imageURL: "../assets/uploads/img23.png",
    comments: [
        {text: "omg so cute!!", 
        userID: "al117", 
        date: "2023-12-20 3:55:43"}, 
        {text: "love ur top", 
        userID: "mo104", 
        date: "2023-12-20 3:55:43"},
        {text: "gorgeous", 
        userID: "sl120", 
        date: "2023-12-20 3:55:43"}
    ], 
    tags: [
        "europe",
        "cottagecore",
        "longskirt",
        "bows",
        "crochet"
    ],
    city: "madrid",
    date: "2024-01-20 10:25:27",
    caption: "nighttime outing!",
    alttext: "A person standing in the street wearing a white tiered skirt, white crochet cardigan, and white crop top."
  };

  const post24 = {
    postID: 20024,
    userID: 'sl120',
    imageURL: "../assets/uploads/img24.png",
    comments: [
        {text: "ahhhh omg cute!!", 
        userID: "al117", 
        date: "2023-12-20 3:55:43"}, 
        {text: "wow love this fit", 
        userID: "mo104", 
        date: "2023-12-20 3:55:43"},
        {text: "gorgeous", 
        userID: "mm124", 
        date: "2023-12-20 3:55:43"}
    ], 
    tags: [
        "streetwear",
        "acubi"
    ],
    city: "new york city",
    date: "2023-03-10 10:25:27",
    caption: "fit today!",
    alttext: "A person wearing black jeans and a white dress with a side-slung fanny pack."
  };

  const post25 = {
    postID: 20025,
    userID: 'mo104',
    imageURL: "../assets/uploads/img25.png",
    comments: [
        {text: "u look so cute!", 
        userID: "al117", 
        date: "2023-12-20 3:55:43"}, 
        {text: "love ur top", 
        userID: "mm124", 
        date: "2023-12-20 3:55:43"}
    ], 
    tags: [
        "fairycore"
          ],
    city: "new york city",
    date: "2023-07-12 10:25:27",
    caption: "felt cute!",
    alttext: "A person wearing a tan skirt and white flowy top posing at night by a river."
  };

  const post26 = {
    postID: 20026,
    userID: 'mo104',
    imageURL: "../assets/uploads/img26.png",
    comments: [], 
    tags: [
        "fairycore",
        "cottagecore"
          ],
    city: "copenhagen",
    date: "2023-11-12 10:25:27",
    caption: "loved this field",
    alttext: "A person standing in a grassy field wearing a long white and pink floral dress with a red cardigan."
  };

  const post27 = {
    postID: 20027,
    userID: 'mm124',
    imageURL: "../assets/uploads/img27.png",
    comments: [
        {text: "so cool", 
        userID: "al117", 
        date: "2023-12-20 3:55:43"}, 
        {text: "love ur vest omg where is it from", 
        userID: "mo104", 
        date: "2023-12-20 3:55:43"}
    ], 
    tags: [
        "y2k",
        "edgy",
        "sunglasses"
          ],
    city: "shanghai",
    date: "2023-12-12 10:25:27",
    caption: "felt cool",
    alttext: "A person wearing pink ombre sunglasses, a black feather vest, and lots of silver jewelry."
  };

  const post28 = {
    postID: 20028,
    userID: 'sl120',
    imageURL: "../assets/uploads/img28.png",
    comments: [
        {text: "oh my god u look so cool", 
        userID: "al117", 
        date: "2023-12-20 3:55:43"}, 
        {text: "wow what a cool fit", 
        userID: "mo104", 
        date: "2023-12-20 3:55:43"}
    ], 
    tags: [
        "edgy",
        "sheer",
        "platforms"
          ],
    city: "beijing",
    date: "2023-10-02 10:25:27",
    caption: "felt cute might delete later",
    alttext: "A person wearing a fur hat and a long mesh black dress."
  };

  const post29 = {
    postID: 20029,
    userID: 'al117',
    imageURL: "../assets/uploads/img29.png",
    comments: [
        {text: "so cute!!", 
        userID: "mo104", 
        date: "2023-12-20 3:55:43"}, 
        {text: "very cool", 
        userID: "mm124", 
        date: "2023-12-20 3:55:43"}
    ], 
    tags: [
        "y2k",
        "city",
        "streetwear",
        "sunglasses"
          ],
    city: "new york city",
    date: "2023-11-02 10:25:27",
    caption: "cafe fit!!",
    alttext: "A person wearing a neon green ruffled button-up top and ripped jeans with a black shoulderbag and sunglasses."
  };

  const post30 = {
    postID: 20030,
    userID: 'al117',
    imageURL: "../assets/uploads/img30.png",
    comments: [
        {text: "absolutely the coolest", 
        userID: "sl120", 
        date: "2023-12-20 3:55:43"}, 
        {text: "love ur jeans!", 
        userID: "sl120", 
        date: "2023-12-20 3:55:43"}
    ], 
    tags: [
        "city",
        "streetwear",
        "sunglasses",
        "baggy"
          ],
    city: "new york city",
    date: "2023-11-02 10:25:27",
    caption: "got new sunglasses",
    alttext: "A person walking towards the camera in baggy faded jeans, a grey sweatshirt, and white sunglasses."
  };

  const post31 = {
    postID: 20031,
    userID: 'sl120',
    imageURL: "../assets/uploads/img31.png",
    comments: [
        {text: "so cute!!", 
        userID: "mm124", 
        date: "2023-12-20 3:55:43"}, 
        {text: "omg love ur boots where are they from", 
        userID: "mo104", 
        date: "2023-12-20 3:55:43"},
        {text: "serving", 
        userID: "mm124", 
        date: "2023-12-20 3:55:43"}
    ], 
    tags: [
        "y2k",
        "streetwear",
        "platforms",
        "miniskirt"
          ],
    city: "new york city",
    date: "2023-11-02 10:25:27",
    caption: "today was such a nice day!",
    alttext: "A person standing by a red building wearing a navy varsity jacket, tan knit top, and tan skirt with black boots."
  };

  const post32 = {
    postID: 20032,
    userID: 'al117',
    imageURL: "../assets/uploads/img32.png",
    comments: [
        {text: "so cool!!", 
        userID: "mm124", 
        date: "2023-12-20 3:55:43"}
    ], 
    tags: [
        "y2k",
        "streetwear",
        "denim",
        "cropped",
        "baggy"
          ],
    city: "london",
    date: "2023-10-02 10:25:27",
    caption: "this matching set is my favorite ever",
    alttext: "A person wearing a matching jacket and jeans with a grey and white pattern and a black crop top."
  };

  const post33 = {
    postID: 20033,
    userID: 'al117',
    imageURL: "../assets/uploads/img33.png",
    comments: [
        {text: "jaw dropped", 
        userID: "mm124", 
        date: "2023-12-20 3:55:43"},
        {text: "stunning!!", 
        userID: "sl120", 
        date: "2023-12-20 3:55:43"},
        {text: "so cool!!", 
        userID: "mo104", 
        date: "2023-12-20 3:55:43"}
    ], 
    tags: [
        "y2k",
        "streetwear",
        "sunglasses"
          ],
    city: "beijing",
    date: "2023-07-02 10:25:27",
    caption: "going out fit!",
    alttext: "A person wearing sunglasses on their head with a pink and white bandeau top and long grey skirt."
  };

  // sample users

  // all users will have the same password for now: 
  const user1 = {
    userID: "mo104", 
    userFirstName: "Maria", 
    userLastName: "Ordal", 
    password: await bcrypt.hash("123456", ROUNDS), 
    email: "mo104@wellesley.edu",
    dateCreated: "2023-12-20"
  };
  const user2 = {
    userID: "mm124", 
    userFirstName: "Maya",
    userLastName: "Mau",
    password: await bcrypt.hash("123456", ROUNDS),
    email: "mm124@wellesley.edu",
    dateCreated: "2023-11-20"
  };

  const user3 = {
    userID: "sl120", 
    userFirstName: "Soo",
    userLastName: "Lee",
    password: await bcrypt.hash("123456", ROUNDS),
    email: "sl120@wellesley.edu",
    dateCreated: "2024-04-16"
  };

  const user4 = {
    userID: "al117", 
    userFirstName: "Anna",
    userLastName: "Lieb",
    password: await bcrypt.hash("123456", ROUNDS),
    email: "al117@wellesley.edu",
    dateCreated: "2024-04-17"
  };

  // sample likes
  const like1 = {postID: 20001, userID: "mo104"};
  const like2 = {postID: 20002, userID: "mm124"};
  const like3 = {postID: 20002, userID: "mo104"};
  const like4 = {postID: 20003, userID: "sl120"};
  const like5 = {postID: 20003, userID: "al117"};
  const like6 = {postID: 20003, userID: "mo104"};
  const like7 = {postID: 20004, userID: "al117"};
  const like8 = {postID: 20005, userID: "al117"};
  const like9 = {postID: 20006, userID: "sl120"};
  const like10 = {postID: 20006, userID: "mm124"};
  const like11 = {postID: 20006, userID: "al117"};
  const like12 = {postID: 20006, userID: "mo104"};
  const like13 = {postID: 20007, userID: "mo104"};
  const like14 = {postID: 20008, userID: "mm124"};
  const like15 = {postID: 20009, userID: "sl120"};
  const like16 = {postID: 20010, userID: "sl120"};
  const like17 = {postID: 20010, userID: "mm124"};
  const like18 = {postID: 20010, userID: "mo104"};
  const like19 = {postID: 20010, userID: "al117"};
  const like20 = {postID: 20011, userID: "al117"};
  const like21 = {postID: 20012, userID: "sl120"};
  const like22 = {postID: 20012, userID: "mm124"};
  const like23 = {postID: 20012, userID: "mo104"};
  const like24 = {postID: 20012, userID: "al117"};
  const like25 = {postID: 20013, userID: "al117"};
  const like26 = {postID: 20013, userID: "mo104"};
  const like27 = {postID: 20013, userID: "mm124"};
  const like28 = {postID: 20014, userID: "mm124"};
  const like29 = {postID: 20014, userID: "mo104"};
  const like30 = {postID: 20014, userID: "al117"};
  const like31 = {postID: 20014, userID: "sl120"};
  const like32 = {postID: 20015, userID: "sl120"};
  const like33 = {postID: 20015, userID: "mm124"};
  const like34 = {postID: 20015, userID: "mo104"};
  const like35 = {postID: 20015, userID: "al117"};
  const like36 = {postID: 20016, userID: "al117"};
  const like37 = {postID: 20016, userID: "sl120"};
  const like38 = {postID: 20016, userID: "mm124"};
  const like39 = {postID: 20017, userID: "mm124"};
  const like40 = {postID: 20017, userID: "al117"};
  const like41 = {postID: 20018, userID: "mo104"};
  const like42 = {postID: 20018, userID: "sl120"};
  const like43 = {postID: 20019, userID: "mm124"};
  const like44 = {postID: 20020, userID: "mm124"};
  const like45 = {postID: 20020, userID: "sl120"};
  const like46 = {postID: 20021, userID: "sl120"};
  const like47 = {postID: 20021, userID: "mm124"};
  const like48 = {postID: 20021, userID: "mo104"};
  const like49 = {postID: 20022, userID: "mo104"};
  const like50 = {postID: 20023, userID: "mm124"};
  const like51 = {postID: 20023, userID: "al117"};
  const like52 = {postID: 20024, userID: "al117"};
  const like53 = {postID: 20024, userID: "mm124"};
  const like54 = {postID: 20024, userID: "mo104"};
  const like55 = {postID: 20024, userID: "sl120"};
  const like56 = {postID: 20025, userID: "mm124"};
  const like57 = {postID: 20027, userID: "mm124"};
  const like58 = {postID: 20027, userID: "al117"};
  const like59 = {postID: 20028, userID: "mo104"};
  const like60 = {postID: 20029, userID: "sl120"};
  const like61 = {postID: 20030, userID: "sl120"};
  const like62 = {postID: 20030, userID: "mm124"};
  const like63 = {postID: 20030, userID: "mo104"};
  const like64 = {postID: 20030, userID: "al117"};
  const like65 = {postID: 20031, userID: "al117"};
  const like66 = {postID: 20032, userID: "mm124"};
  const like67 = {postID: 20032, userID: "mo104"};
  const like68 = {postID: 20033, userID: "mo104"};

  let lsPosts = [post1, post2, post3, post4, post5, post6, post7, post8, post9, post10,
                post11, post12, post13, post14, post15, post16, post17, post18, post19,
                post20, post21, post22, post23, post24, post25, post26, post27, post28,
                post29, post30, post31, post32, post33];
  let lsUsers = [user1, user2, user3, user4];
  let lsLikes = [like1, like2, like3, like4, like5, like6, like7, like8, like9, like10,
                like11, like12, like13, like14, like15, like16, like17, like18, like19,
                like20, like21, like22, like23, like24, like25, like26, like27, like28,
                like29, like30, like31, like32, like33, like34, like35, like36, like37,
                like38, like39, like40, like41, like42, like43, like44, like45, like46,
                like47, like48, like49, like50, like51, like52, like53, like54, like55,
                like56, like57, like58, like59, like60, like61, like62, like63, like64,
                like65, like66, like67, like68];

  // delete all data from each collection
  let deletePosts = await deleteDocuments(myDB, POSTS);
  console.log("successfully deletePosts:", deletePosts);

  let deleteUsers = await deleteDocuments(myDB, USERS);
  console.log("successfully deleteUsers:", deleteUsers);

  let deleteLikes = await deleteDocuments(myDB, LIKES);
  console.log("successfully deleteLikes:", deleteLikes);
  
  // insert all data into each collection
  await insertDocuments(myDB, POSTS, lsPosts);
  await insertDocuments(myDB, USERS, lsUsers);
  await insertDocuments(myDB, LIKES, lsLikes);

  // print out all data
  let postsAfter = await findDocuments(myDB, POSTS);
  console.log("find posts after inserting:", postsAfter);

  let usersAfter = await findDocuments(myDB, USERS);
  console.log("find users after inserting:", usersAfter);

  let likesAfter = await findDocuments(myDB, LIKES);
  console.log("find likes after inserting:", likesAfter);


  await Connection.close();
}

main().catch(console.error);


