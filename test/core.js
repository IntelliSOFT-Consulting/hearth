'use strict'
const env = require('./test-env/init')()
const server = require('../lib/server')
const tap = require('tap')
const request = require('request')

const headers = env.getTestAuthHeaders(env.users.sysadminUser.email)
const testPatients = env.testPatients()

const basicCoreTest = (t, test) => {
  env.initDB((err, db) => {
    t.error(err)

    server.start((err) => {
      t.error(err)
      test(db, () => {
        env.clearDB((err) => {
          t.error(err)
          server.stop(() => {
            t.end()
          })
        })
      })
    })
  })
}

const requestAndAssertResponseOperationOutcome = (tp, t, done) => {
  // When
  request({
    url: `http://localhost:3447/fhir/Patient/${tp.id}`,
    headers: headers,
    json: true
  }, (err, res, body) => {
    // Then
    t.error(err)
    t.equal(res.statusCode, tp.statusCode, 'response status should match')

    t.equal(body.resourceType, 'OperationOutcome', 'Reponse body should be an Operation Outcome')
    t.equal(body.issue[0].severity, tp.expectedResponse.severity)
    t.equal(body.issue[0].code, tp.expectedResponse.code)
    t.equal(body.issue[0].details.text, tp.expectedResponse.details)
    done()
  })
}

tap.test('Core', { autoend: true }, (t) => {
  t.test('Read function', { autoend: true }, (t) => {
    t.test('should read a non existent patient should return 404 - not found', (t) => {
      basicCoreTest(t, (db, done) => {
        const expectedResponse = {
          severity: 'information',
          code: 'not-found',
          details: 'Not found'
        }

        const testParams = {
          id: 'non-existent-id',
          expectedResponse: expectedResponse,
          statusCode: 404
        }

        requestAndAssertResponseOperationOutcome(testParams, t, done)
      })
    })
  })

  t.test('Delete function', { autoend: true }, (t) => {
    t.test('should read a deleted patient should return 410 - gone', (t) => {
      const id = '1111111111'
      basicCoreTest(t, (db, done) => {
        const charlton = testPatients.charlton.patient
        charlton.id = id

        const c = db.collection('Patient')
        c.insertOne(charlton, (err, doc) => {
          t.error(err)

          request({
            url: `http://localhost:3447/fhir/Patient/${id}`,
            method: 'DELETE',
            headers: headers,
            json: true
          }, (err, res, body) => {
            t.error(err)
            t.equal(res.statusCode, 204)

            c.findOne({ id: id }, (err, doc) => {
              t.error(err)
              t.notOk(doc)

              const ch = db.collection('Patient_history')
              ch.findOne({ id: id }, (err, doc) => {
                t.error(err)
                t.ok(doc)
                t.equal(doc.id, id, 'Deleted doc should exist in history')

                const expectedResponse = {
                  severity: 'information',
                  code: 'gone',
                  details: 'Gone'
                }

                const testParams = {
                  id: '1111111111',
                  expectedResponse: expectedResponse,
                  statusCode: 410
                }

                requestAndAssertResponseOperationOutcome(testParams, t, done)
              })
            })
          })
        })
      })
    })
  })
})
