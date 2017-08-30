'use strict'

const tap = require('tap')
const moment = require('moment')

const auditPlugin = require('../lib/plugins/audit')()

const testResourceTemplate = {
  'resourceType': 'Patient',
  'id': '1',
  'active': true,
  'identifier': [
    {
      'use': 'official',
      'system': 'pshr:passport:za',
      'value': '1001113333933',
      'assigner': {
        'display': 'Passport South Africa'
      }
    }
  ],
  'name': [
    {
      'use': 'official',
      'prefix': [
        'Mr'
      ],
      'family': [
        'Matinyana'
      ],
      'given': [
        'Charlton',
        'Joseph'
      ]
    }
  ],
  'gender': 'male',
  'birthDate': '1970-07-21'
}

tap.test('Audit Plugin - getSuccessOrFailed()', { autoend: true }, (t) => {
  t.test('should determine the event outcome value for a successfull request', (t) => {
    // given
    const resource = JSON.parse(JSON.stringify(testResourceTemplate))

    // when
    const successOrFailValue = auditPlugin.getSuccessOrFailed(resource)

    t.equal(successOrFailValue, 0, `should return a success/fail value of 0 - Success`)

    t.end()
  })

  t.test('should determine the event outcome value for a unsuccessfull request', (t) => {
    // given
    const resource = {
      resourceType: 'OperationOutcome',
      issue: [{"severity":"information","code":"gone","details":{"text":"Gone"}}]
    }

    // when
    const successOrFailValue = auditPlugin.getSuccessOrFailed(resource)

    t.equal(successOrFailValue, 4, `should return a success/fail value of 4 - Minor Failure`)

    t.end()
  })
})

tap.test('Audit Plugin - buildEventObj()', { autoend: true }, (t) => {
  t.test('should build the eventObj object', (t) => {
    // given
    const resource = JSON.parse(JSON.stringify(testResourceTemplate))

    // when
    const eventObj = auditPlugin.buildEventObj('read', resource)

    t.ok(eventObj)

    t.equals(eventObj.type.coding[0].code, 'rest', 'should have a value of \'rest\'')
    t.equals(eventObj.type.coding[0].display, 'Restful Operation', 'should have a value of \'Restful Operation\'')
    t.equals(eventObj.subtype[0].coding[0].code, 'read', 'should have a value of \'read\'')
    t.equals(eventObj.subtype[0].coding[0].display, 'read', 'should have a value of \'read\'')
    t.equals(moment(eventObj.dateTime).isValid(), true, 'should be a valid timestamp value')
    t.equals(eventObj.outcome, 0, 'should have a value of \'0\'')

    t.end()
  })
})

tap.test('Audit Plugin - buildParticipantObj()', { autoend: true }, (t) => {
  t.test('should build the participantObj object', (t) => {
    // given
    const ctx = {
      authenticatedUser: {
        email: 'user@hearth.org',
        type: 'practitioner',
        resource: 'Practitioner/b7aeb450-8bde-11e7-812f-bbfc0872406b'
      },
      url: '/fhir/Questionnaire?identifier=preoperative-questionnaire',
      query: { identifier: 'preoperative-questionnaire' },
      headers: {
        referer: 'http://localhost:9000/'
      }
    }

    // when
    const participantObj = auditPlugin.buildParticipantObj(ctx)

    t.ok(participantObj)
    
    t.equals(participantObj.role, 'practitioner', 'should have a value of \'practitioner\'')
    t.equals(participantObj.reference, 'Practitioner/b7aeb450-8bde-11e7-812f-bbfc0872406b', 'should have a value of \'Practitioner/b7aeb450-8bde-11e7-812f-bbfc0872406b\'')
    t.equals(participantObj.userId, 'b7aeb450-8bde-11e7-812f-bbfc0872406b', 'should have a value of \'b7aeb450-8bde-11e7-812f-bbfc0872406b\'')
    t.equals(participantObj.altId, 'user@hearth.org', 'should have a value of \'user@hearth.org\'')
    t.equals(participantObj.requester, true, 'should have a value of \'true\'')

    t.end()
  })
})

tap.test('Audit Plugin - buildSourceObj()', { autoend: true }, (t) => {
  t.test('should build the sourceObj object', (t) => {
    // given
    const ctx = {
      authenticatedUser: {
        email: 'jenny@sssa.org',
        type: 'practitioner',
        resource: 'Practitioner/b7aeb450-8bde-11e7-812f-bbfc0872406b'
      },
      url: '/fhir/Questionnaire?identifier=preoperative-questionnaire',
      query: { identifier: 'preoperative-questionnaire' },
      headers: {
        referer: 'http://localhost:9000/'
      }
    }

    // when
    const sourceObj = auditPlugin.buildSourceObj(ctx)

    t.ok(sourceObj)
    
    t.equals(sourceObj.site, 'Cloud', 'should have a value of \'Cloud\'')
    t.equals(sourceObj.identifier, 'http://localhost:9000/', 'should have a value of \'http://localhost:9000/\'')
    t.equals(sourceObj.type[0].system, 'http://hl7.org/fhir/security-source-type', 'should have a value of \'http://hl7.org/fhir/security-source-type\'')
    t.equals(sourceObj.type[0].code, 3, 'should have a value of \'3\'')
    t.equals(sourceObj.type[0].display, 'Web Server', 'should have a value of \'Web Server\'')

    t.end()
  })
})

tap.test('Audit Plugin - buildObjectObj()', { autoend: true }, (t) => {
  t.test('should build the objectObj object', (t) => {
    // given
    const ctx = {
      authenticatedUser: {
        email: 'jenny@sssa.org',
        type: 'practitioner',
        resource: 'Practitioner/b7aeb450-8bde-11e7-812f-bbfc0872406b'
      },
      url: '/fhir/Questionnaire?identifier=preoperative-questionnaire',
      query: { identifier: 'preoperative-questionnaire' },
      headers: {
        referer: 'http://localhost:9000/'
      }
    }

    // when
    const objectObj = auditPlugin.buildObjectObj(ctx)

    t.ok(objectObj)
    
    t.equals(objectObj.query, ctx.query, 'should have a value of \'{ identifier: \'preoperative-questionnaire\' }\'')
    t.equals(objectObj.reference.reference, '/fhir/Questionnaire', 'should have a value of \'/fhir/Questionnaire\'')

    t.end()
  })
})

tap.test('Audit Plugin - buildAuditEvent()', { autoend: true }, (t) => {
  t.test('should build the AuditEvent object', (t) => {
    // given
    const resource = JSON.parse(JSON.stringify(testResourceTemplate))
    const ctx = {
      authenticatedUser: {
        email: 'jenny@sssa.org',
        type: 'practitioner',
        resource: 'Practitioner/b7aeb450-8bde-11e7-812f-bbfc0872406b'
      },
      url: '/fhir/Questionnaire?identifier=preoperative-questionnaire',
      query: { identifier: 'preoperative-questionnaire' },
      headers: {
        referer: 'http://localhost:9000/'
      }
    }

    // when
    const auditEvent = auditPlugin.buildAuditEvent('read', ctx, 'Patient', resource)

    t.ok(auditEvent)
    t.ok(auditEvent.event)
    t.ok(auditEvent.participant)
    t.ok(auditEvent.source)
    t.ok(auditEvent.object)

    t.end()
  })
})