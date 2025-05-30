import type { ZodLiteral, ZodObject, ZodOptional, ZodRawShape, ZodString } from 'zod'
import { z } from 'zod'
import { MESSAGE_DEDUPLICATION_OPTIONS_SCHEMA } from '../messages/messageDeduplicationSchemas.ts'

// External message metadata that describe the context in which the message was created, primarily used for debugging purposes
export const PUBLISHER_MESSAGE_METADATA_SCHEMA = z
  .object({
    schemaVersion: z.optional(z.string().min(1).describe('message schema version')),
    // this is always set to a service that created the message
    producedBy: z.optional(z.string().min(1).describe('app/service that produced the message')),
    // this is always propagated within the message chain. For the first message in the chain it is equal to "producedBy"
    originatedFrom: z.optional(
      z
        .string()
        .min(1)
        .describe('app/service that initiated entire workflow that led to creating this message'),
    ),
    // this is always propagated within the message chain.
    correlationId: z.optional(
      z.string().describe('unique identifier passed to all events in workflow chain'),
    ),
  })
  .describe('external message metadata')

export const CONSUMER_MESSAGE_METADATA_SCHEMA = z
  .object({
    schemaVersion: z.string().min(1).describe('message schema version'),
    // this is always set to a service that created the message
    producedBy: z.string().min(1).describe('app/service that produced the message'),
    // this is always propagated within the message chain. For the first message in the chain it is equal to "producedBy"
    originatedFrom: z
      .string()
      .min(1)
      .describe('app/service that initiated entire workflow that led to creating this message'),
    // this is always propagated within the message chain.
    correlationId: z.string().describe('unique identifier passed to all events in workflow chain'),
  })
  .describe('external message metadata')

// Base event fields that are typically autogenerated
export const GENERATED_BASE_EVENT_SCHEMA = z.object({
  id: z.string().describe('event unique identifier'),
  timestamp: z.string().datetime().describe('iso 8601 datetime'),
  deduplicationId: z.string().nullish().describe('event deduplication identifier'),
  deduplicationOptions: MESSAGE_DEDUPLICATION_OPTIONS_SCHEMA.nullish().describe(
    'event deduplication options',
  ),
  // For internal domain events that did not originate within a message chain metadata field can be omitted, producer should then assume it is initiating a new chain
  metadata: CONSUMER_MESSAGE_METADATA_SCHEMA,
})

// Base event fields that are typically autogenerated, marked as optional
export const OPTIONAL_GENERATED_BASE_EVENT_SCHEMA = z.object({
  id: z.string().describe('event unique identifier').optional(),
  timestamp: z.string().datetime().describe('iso 8601 datetime').optional(),
  deduplicationId: z.string().describe('event deduplication identifier').nullish(),
  deduplicationOptions: MESSAGE_DEDUPLICATION_OPTIONS_SCHEMA.describe(
    'event deduplication options',
  ).nullish(),
  // For internal domain events that did not originate within a message chain metadata field can be omitted, producer should then assume it is initiating a new chain
  metadata: PUBLISHER_MESSAGE_METADATA_SCHEMA.optional(),
})

// Base event fields that are always defined manually
export const CORE_EVENT_SCHEMA = z.object({
  type: z.literal<string>('<replace.me>').describe('event type name'),
  payload: z.optional(z.object({})).describe('event payload based on type'),
})

// Core fields that describe either internal event or external message
export const CONSUMER_BASE_EVENT_SCHEMA = GENERATED_BASE_EVENT_SCHEMA.extend(
  CORE_EVENT_SCHEMA.shape,
)
export const PUBLISHER_BASE_EVENT_SCHEMA = OPTIONAL_GENERATED_BASE_EVENT_SCHEMA.extend(
  CORE_EVENT_SCHEMA.shape,
)

export type ConsumerBaseEventType = z.infer<typeof CONSUMER_BASE_EVENT_SCHEMA>
export type PublisherBaseEventType = z.infer<typeof PUBLISHER_BASE_EVENT_SCHEMA>
export type CoreEventType = z.infer<typeof CORE_EVENT_SCHEMA>
export type GeneratedBaseEventType = z.infer<typeof GENERATED_BASE_EVENT_SCHEMA>

type ReturnType<T extends ZodObject<Y>, Y extends ZodRawShape, Z extends string> = {
  consumerSchema: ZodObject<{
    id: ZodString
    timestamp: ZodString
    type: ZodLiteral<Z>
    payload: T
  }>

  publisherSchema: ZodObject<{
    id: ZodOptional<ZodString>
    timestamp: ZodOptional<ZodString>
    type: ZodLiteral<Z>
    payload: T
  }>
}

export function enrichEventSchemaWithBase<
  T extends ZodObject<Y>,
  Y extends ZodRawShape,
  Z extends string,
>(type: Z, payloadSchema: T): ReturnType<T, Y, Z> {
  const baseSchema = z.object({
    type: z.literal(type),
    payload: payloadSchema,
  })

  const consumerSchema = GENERATED_BASE_EVENT_SCHEMA.merge(baseSchema)
  const publisherSchema = OPTIONAL_GENERATED_BASE_EVENT_SCHEMA.merge(baseSchema)

  return {
    consumerSchema: consumerSchema,
    publisherSchema: publisherSchema,
  }
}
