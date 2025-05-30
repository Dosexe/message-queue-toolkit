import { describe, expect, it } from 'vitest'
import type { PERMISSIONS_MESSAGE_TYPE } from '../../test/consumers/userConsumerSchemas.ts'
import { PERMISSIONS_MESSAGE_SCHEMA } from '../../test/consumers/userConsumerSchemas.ts'
import { SqsConsumerErrorResolver } from '../errors/SqsConsumerErrorResolver.ts'
import type { SQSMessage } from '../types/MessageTypes.ts'
import { deserializeSQSMessage } from './sqsMessageDeserializer.ts'

describe('messageDeserializer', () => {
  it('deserializes valid JSON', () => {
    const messagePayload = {
      id: '1',
      messageType: 'add',
      userIds: [1],
      permissions: ['perm'],
      nonSchemaField: 'nonSchemaField',
    }
    const message: SQSMessage = {
      Body: JSON.stringify(messagePayload),
    } as SQSMessage

    const errorProcessor = new SqsConsumerErrorResolver()

    const deserializedPayload = deserializeSQSMessage(
      message,
      PERMISSIONS_MESSAGE_SCHEMA,
      errorProcessor,
    )

    expect(deserializedPayload.result).toEqual({
      originalMessage: messagePayload,
      parsedMessage: {
        id: '1',
        messageType: 'add',
        userIds: [1],
        permissions: ['perm'],
      },
    })
  })

  it('throws an error on invalid JSON', () => {
    const messagePayload: Partial<PERMISSIONS_MESSAGE_TYPE> = {
      userIds: [1],
    }
    const message: SQSMessage = {
      Body: JSON.stringify(messagePayload),
    } as SQSMessage

    const errorProcessor = new SqsConsumerErrorResolver()

    const deserializedPayload = deserializeSQSMessage(
      message,
      PERMISSIONS_MESSAGE_SCHEMA,
      errorProcessor,
    )

    expect(deserializedPayload.error).toMatchObject({
      errorCode: 'MESSAGE_VALIDATION_ERROR',
    })
  })

  it('throws an error on non-JSON', () => {
    const message = 'dummy'

    const errorProcessor = new SqsConsumerErrorResolver()

    const deserializedPayload = deserializeSQSMessage(
      message as any,
      PERMISSIONS_MESSAGE_SCHEMA,
      errorProcessor,
    )

    expect(deserializedPayload.error).toMatchObject({
      errorCode: 'MESSAGE_INVALID_FORMAT',
    })
  })
})
