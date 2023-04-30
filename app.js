const express = require("express");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const path = require("path");
const bcrypt = require("bcrypt");

let db = null;
const app = express();
app.use(express.json());

const dbPath = path.join(__dirname, "userData.db");

const initialize = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("server started");
    });
  } catch (e) {
    console.log(`DB Error:${e.message}`);
  }
};
initialize();

app.post("/register", async (request, response) => {
  const { username, name, password, gender, location } = request.body;

  const hashedPassword = await bcrypt.hash(password, 10);
  const selectUserQuery = `SELECT * FROM user WHERE username = '${username}'`;
  const dbUser = await db.get(selectUserQuery);
  if (password.length < 5) {
    response.status(400);
    response.send("Password is too short");
  } else if (dbUser === undefined) {
    const createUserQuery = `
      INSERT INTO 
        user (username, name, password, gender, location) 
      VALUES 
        (
          '${username}', 
          '${name}',
          '${hashedPassword}', 
          '${gender}',
          '${location}'
        )`;
    const dbResponse = await db.run(createUserQuery);
    const newUserId = dbResponse.lastID;
    response.send("User created successfully");
  } else {
    response.status(400);
    response.send("User already exists");
  }
});

app.post("/login", async (request, response) => {
  const { username, password } = request.body;

  const selectUserQuery = `SELECT * FROM user WHERE username='${username}'`;
  const dbUser = await db.get(selectUserQuery);

  if (dbUser === undefined) {
    response.status(400);
    response.send("Invalid user");
  } else {
    const isPasswordCorrect = await bcrypt.compare(password, dbUser.password);

    if (isPasswordCorrect) {
      response.status(200);
      response.send("Login success!");
    } else {
      response.status(400);
      response.send("Invalid password");
    }
  }
});

app.put("/change-password", async (request, response) => {
  const { username, oldPassword, newPassword } = request.body;

  if (newPassword.length < 5) {
    response.status(400);
    response.send("Password is too short");
  } else {
    const selectUserQuery = `SELECT * FROM user WHERE username = '${username}'`;
    const dbUser = await db.get(selectUserQuery);

    if (!dbUser) {
      response.status(400);
      response.send("Invalid user");
    } else {
      const isOldPasswordCorrect = await bcrypt.compare(
        oldPassword,
        dbUser.password
      );

      if (isOldPasswordCorrect) {
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        const updatePasswordQuery = `
          UPDATE user SET password = '${hashedPassword}'
          WHERE username = '${username}'
        `;
        await db.run(updatePasswordQuery);
        response.status(200);
        response.send("Password updated");
      } else {
        response.status(400);
        response.send("Invalid current password");
      }
    }
  }
});

module.exports = app;
