const fs = require("fs");
const Handlebars = require("handlebars");
const dateFns = require("date-fns");

String.prototype.replaceAll = function (target, payload) {
  let regex = new RegExp(target, "g");
  return this.valueOf().replace(regex, payload);
};

const sourcePath = "./tweets.json";
let source = fs.readFileSync(sourcePath);

let templateContent = fs.readFileSync("./template.hbs").toString();
template = Handlebars.compile(templateContent, { noEscape: true });

let tweets = JSON.parse(source).tweets;

let findReplyToId = (id) => {
  let remaining = tweets.filter(function (t) {
    return t.tweet.in_reply_to_status_id_str === id;
  });
  return remaining[0];
};

let getContent = (t) => {
  let content = t.tweet.full_text;
  urls = t.tweet.entities.urls || [];
  urls.map(function (url) {
    let display_url = url.display_url;
    if (display_url.slice(-1) == "…") {
      display_url = url.expanded_url;
    }
    let markdownUrl = "[" + display_url + "](" + url.expanded_url + ")";
    content = content.replaceAll(url.url, markdownUrl);
  });
  atMentions = t.tweet.entities.user_mentions || [];
  atMentions.map(function (mention) {
    let markdownUrl =
      "[" + mention.name + "](https://twitter.com/" + mention.screen_name + ")";
    content = content.replaceAll("@" + mention.screen_name, markdownUrl);
  });
  content = content.replaceAll("&gt;", ">");
  content = content.replaceAll("•", "-");
  return content;
};

let outputTweet = (t) => {
  let tweetContent = getContent(t);

  let reply = findReplyToId(t.tweet.id);

  let singleton = true;

  while (reply) {
    tweetContent = tweetContent + "\n\n" + getContent(reply);
    reply = findReplyToId(reply.tweet.id);
    singleton = false;
  }

  const date = new Date(t.tweet.created_at);

  const slug = dateFns.format(date, 'y-MM-dd');
  const destPath = "./output/" + slug + ".md";

  const twitterLink = "https://twitter.com/DuncanMalashock/status/" + t.tweet.id
  const destContent = template({ content: tweetContent, date: date.toISOString(), twitterLink: twitterLink });

  if (t.tweet.in_reply_to_status_id_str || singleton) {
    return;
  } else {
    fs.writeFile(destPath, destContent, (error) => {
      if (error) {
        console.log("Error: ", error);
        return;
      }
      console.log(destPath + " written successfully");
    });
  }
};

tweets.map(outputTweet);
