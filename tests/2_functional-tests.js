/*
 *
 *
 *       FILL IN EACH FUNCTIONAL TEST BELOW COMPLETELY
 *       -----[Keep the tests in the same order!]-----
 *       (if additional are added, keep them at the very end!)
 */

var chaiHttp = require("chai-http");
var chai = require("chai");
var assert = chai.assert;
var expect = chai.expect;
var server = require("../server");

chai.use(chaiHttp);
chai.use(require("chai-datetime"));

suite("Functional Tests", function () {
  let board = "test_board",
    text = "test text",
    delete_password = "delete",
    thread_id = []
  reply_id = 0;
  suite("API ROUTING FOR /api/threads/:board", function () {
    suite("POST", function () {
      for (let i = 0; i < 11; i++) {
        test("Test POST /api/threads/:board/", function (done) {
          chai
            .request(server)
            .post("/api/threads/" + board)
            .send({
              text: text + i,
              delete_password: delete_password + i
            })
            .end(function (err, res) {
              assert.equal(err, null);
              if (res.text == "duplicate text") assert.equal(res.status, 400);
              else assert.equal(res.status, 200);
              //expect(res).to.redirectTo(`${process.cwd()}/b/${board}`);
              //assert.equal(res.redirectTo,`/b/${board}`);
              done();
            });
        });
      }
    });

    suite("GET", function () {
      test("Test GET /api/threads/:board", function (done) {
        chai
          .request(server)
          .get("/api/threads/" + board)
          .end(function (err, res) {
            assert.equal(res.status, 200);
            assert.equal(err, null);
            assert.isArray(res.body);
            assert.isAtMost(res.body.length, 10); //10 most recent threads
            res.body.forEach((thread, index, threads) => {
              thread_id[index] = thread._id;
              assert.property(thread, "replies");
              assert.isArray(thread.replies);
              assert.isAtMost(thread.replies.length, 3); //3 most recent replies
              assert.notProperty(thread, "delete_password"); //response does not contain delete password
              assert.notProperty(thread, "reported"); //response does not contain reported status
              assert.property(thread, "board");
              assert.isString(thread.board);
              assert.property(thread, "text");
              assert.isString(thread.text);
              assert.property(thread, "created_on");
              assert.property(thread, "bumped_on");
              if (index < 9) {
                assert.notBeforeTime(
                  new Date(thread.bumped_on),
                  new Date(threads[index + 1].bumped_on)
                ); //sorted threads by date
              }
              thread.replies.forEach((reply, index, replies) => {
                assert.notBeforeTime(
                  reply.created_on,
                  replies[index + 1].created_on
                ); //sorted replies by date
              });
            });
            done();
          });
      });
    });

    suite("DELETE", function () {
      for (let i = 0, j = 10; i < 10; i++, j--) {
        test("Test DELETE /api/threads/:board - correct password", function (done) {
          chai
            .request(server)
            .delete("/api/threads/" + board)
            .send({
              thread_id: thread_id[i],
              delete_password: delete_password + j
            })
            .end(function (err, res) {
              assert.equal(err, null);
              assert.equal(res.status, 200);
              assert.equal(res.text, "success");
              done();
            });
        });
      }
    });

    suite("DELETE", function () {
      test("Test DELETE /api/threads/:board - incorrect password", function (done) {
        chai.request(server).get("/api/threads/" + board).end(function (err, res) {
          thread_id[0] = res.body[0]._id;
          done();
        })
        chai
          .request(server)
          .delete("/api/threads/" + board)
          .send({
            thread_id: thread_id[0],
            delete_password: delete_password
          })
          .end(function (err, res) {
            assert.equal(err, null);
            assert.equal(res.status, 200);
            assert.equal(res.text, "incorrect password");
            done();
          });
      });
    });

    suite("PUT", function () {
      test('Test PUT /api/threads/:board - thread id in db', function (done) {
        chai.request(server)
          .put("/api/threads/" + board)
          .send({
            thread_id: thread_id[0]
          })
          .end(function (err, res) {
            assert.equal(err, null);
            assert.equal(res.status, 200);
            assert.equal(res.text, "success");
            done();
          })
      });
    });
  });

  suite("API ROUTING FOR /api/replies/:board", function () {
    suite("POST", function () {
      test('Test POST /api/replies/:board', function (done) {
        chai.request(server)
          .post("/api/replies/board")
          .send({
            text: 'test text',
            delete_password: 'delete_post',
            thread_id: thread_id[0]
          })
          .end(function (err, res) {
            assert.equal(err, null);
            assert.equal(res.status, 200);
            done();
          })
      });
    });

    suite("GET", function () {
      test("test GET /api/replies/:board", function (done) {
        chai.request(server)
          .get("/api/replies/" + board)
          .query({ thread_id: thread_id[0] })
          .end(function (err, res) {
            assert.equal(err, null);
            assert.equal(res.status, 200);
            assert.property(res.body, 'board');
            assert.property(res.body, 'text');
            assert.property(res.body, 'replies');
            assert.isArray(res.body.replies);
            assert.notProperty(res.body, 'delete_password');
            assert.notProperty(res.body, 'reported');
            assert.property(res.body, 'created_on');
            assert.property(res.body, 'bumped_on');
            reply_id = res.body.replies[0]._id;
            done();
          })
      })
    });

    suite("PUT", function () {
      test("Test PUT /api/replies/:board - both ids in db", function (done) {
        chai.request(server)
          .put("/api/replies/" + board)
          .send({
            thread_id: thread_id[0],
            reply_id
          })
          .end(function (err, res) {
            assert.equal(err, null);
            assert.equal(res.status, 200);
            assert.equal(res.text, 'success');
          })
        chai.request(server)
          .get('/api/replies/' + board)
          .query({ thread_id: thread_id[0] })
          .end(function (err, res) {
            assert.equal(err, null);
            assert.equal(res.status, 200);
            assert.equal(res.body.replies[0].reported, true);
            done();
          })
      })
    });

    suite('DELETE', function () {
      test('Test DELETE /api/replies/:board - incorrect password', function (done) {
        chai.request(server)
          .delete('/api/replies/' + board)
          .send({
            delete_password,
            reply_id,
            thread_id: thread_id[0],
          })
          .end(function (err, res) {
            assert.equal(err, null);
            assert.equal(res.status, 200);
            assert.equal(res.text, 'incorrect password');
            done();
          });
      });
    });

    suite('DELETE', function () {
      test('Test DELETE /api/replies/:board - correct password', function (done) {
        chai.request(server)
          .delete('/api/replies/' + board)
          .send({
            delete_password: 'delete_post',
            reply_id,
            thread_id: thread_id[0],
          })
          .end(function (err, res) {
            assert.equal(err, null);
            assert.equal(res.status, 200);
            assert.equal(res.text, 'success');
          });

        chai.request(server)
          .get('/api/replies/' + board)
          .query({ thread_id: thread_id[0] })
          .end(function (err, res) {
            assert.equal(err, null);
            assert.equal(res.status, 200);
            assert.equal(res.body.replies[0].text, '[deleted]');
            done();
          })
      });
    });
  });
});

