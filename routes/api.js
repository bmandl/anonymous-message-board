/*
 *
 *
 *       Complete the API routing below
 *
 *
 */

"use strict";

var expect = require("chai").expect;
var mongoose = require("mongoose");
var bcrypt = require("bcrypt");

let ThreadSchema = new mongoose.Schema({
  board: String,
  text: { type: String, unique: true },
  created_on: Date,
  bumped_on: Date,
  reported: { type: Boolean, default: false },
  delete_password: { type: String, unique: true },
  replies: [
    {
      text: String,
      created_on: Date,
      reported: { type: Boolean, default: false },
      delete_password: String
    }
  ]
});

ThreadSchema.pre("save", function (next) {
  if (!this.created_on) {
    this.created_on = new Date();
    this.bumped_on = new Date();
  }
  next();
});

let Thread = mongoose.model("threads", ThreadSchema);

function Reply(text, created_on, delete_password) {
  this.text = text;
  this.created_on = created_on;
  this.delete_password = delete_password;
}

function sortReplies(replies) {
  return replies.sort((a, b) => new Date(b.created_on) - new Date(a.created_on))
    .slice(0, 3);
}

module.exports = function (app) {
  //THREADS..............................................
  app.route("/api/threads/:board")

    //GET
    .get((req, res) => {
      let id = req.params.thread_id;
      let board = req.params.board;

      Thread.find({ board }).select('board text created_on bumped_on replies').sort('-bumped_on').limit(10)
        .then(threads => {
          threads = threads.map(thread => {
            thread.replies = sortReplies(thread.replies);
            return thread;
          });

          res.json(threads);
        })
        .catch(err => {
          console.log(err);
        });
    })

    //POST
    .post((req, res) => {
      let board = req.params.board;
      let text = req.body.text;
      let password = bcrypt.hashSync(req.body.delete_password, 12);
      let newThread = new Thread({
        board,
        text,
        delete_password: password
      });

      newThread
        .save()
        .then(thread => {
          res.redirect(`/b/${board}`);
        })
        .catch(err => {
          //console.log(err.code);
          if(err.code == 11000) res.status(400).send('duplicate text');
        });
    })

    //DELETE
    .delete((req, res) => {
      let board = req.body.board;
      let thread_id = req.body.thread_id;
      let password = req.body.delete_password;

      Thread.findById(thread_id, { delete_password: 1 }).then(hash => {
        hash = hash.delete_password;
        if (bcrypt.compareSync(password, hash)) {
          Thread.findByIdAndDelete(thread_id).then(deleted => {
            console.log(`deleted: ${deleted}`);
            res.send('success');
          })
            .catch(err => {
              console.log(err);
            })
        }
        else res.send('incorrect password');
      })
        .catch(err => {
          console.log(err);
        });
    })

    //PUT
    .put((req, res) => {
      let board = req.params.board;
      let thread_id = req.body.thread_id;
      Thread.findByIdAndUpdate(thread_id, { reported: true }).then(thread => {
        console.log(thread);
        res.send('success');
      })
        .catch(err => {
          console.log(err);
        })
    })

  //REPLIES............................................................

  app.route("/api/replies/:board")

    //GET
    .get((req, res) => {
      let id = req.query.thread_id;
      let board = req.params.board;

      Thread.findById(id, { delete_password: 0, reported: 0 }).then(thread => {
        res.json(thread);
      })
        .catch(err => {
          console.log(err);
        });
    })

    //POST
    .post((req, res) => {
      let text = req.body.text;
      let password = req.body.delete_password;
      let thread_id = req.body.thread_id;
      let board = req.params.board;
      let now = new Date();

      let reply = new Reply(text, now, bcrypt.hashSync(password, 12));

      Thread.updateOne(
        {
          _id: thread_id
        },
        {
          bumped_on: now,
          $push: { replies: reply }
        }
      )
        .then(data => {
          res.redirect(`/b/${board}/${thread_id}`);
        })
        .catch(err => {
          console.log(err);
        });
    })

    //DELETE
    .delete((req, res) => {
      let board = req.body.board;
      let thread_id = req.body.thread_id;
      let reply_id = req.body.reply_id;
      let password = req.body.delete_password;

      Thread.findById(thread_id, { replies: 1 }).then(replies => {
        replies = replies.replies;
        let reply = replies.id(reply_id);
        let hash = reply.delete_password;
        if (bcrypt.compareSync(password, hash)) {
          let index = replies.indexOf(reply);
          let post = reply.toObject();
          post.text = '[deleted]';
          replies.splice(index, 1, post);
          reply.parent().save().then(data => {
            res.send('success');
          })
            .catch(err => {
              console.log(err);
            })
        }
        else res.send('incorrect password');
      })
        .catch(err => {
          console.log(err);
        });
    })

    //PUT
    .put((req, res) => {
      let board = req.params.board;
      let thread_id = req.body.thread_id;
      let reply_id = req.body.reply_id;

      Thread.findById(thread_id, { replies: 1 }).then(replies => {
        replies = replies.replies;
        let reply = replies.id(reply_id);
        let index = replies.indexOf(reply);
        let post = reply.toObject();
        post.reported = true;
        replies.splice(index, 1, post);
        reply.parent().save().then(data => {
          res.send('success');
        })
          .catch(err => {
            console.log(err);
          })
      })
        .catch(err => {
          console.log(err);
        })
    })
};
