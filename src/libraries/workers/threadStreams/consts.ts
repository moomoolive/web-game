/*
all messages passed between threads are in the form
of Float64Arrays

passing messages between threads holds this convention:
[
  the_handler_to_be_called, => AKA: STREAM_HANDLER
  an_id_for_current_stream, => AKA: STREAM_ID
  an_id_denoting_the_stream_id_it_is_responding_to, => AKA: RESPONSE_ID
  padding (always one zero), => AKA: META_DATA_PAYLOAD_DIVIDER
  the rest of the array is the message payload (if it exists)
]
*/
export const META_DATA_PAYLOAD_DIVIDER = 0
export const PAYLOAD_START_INDEX = 4
export const NO_RESPONSE_ID = -1

export const THREAD_STREAM_HANDLER_INDEX = 0
export const THREAD_STREAM_ID_INDEX = 1
export const THREAD_STREAM_RESPONSE_ID_INDEX = 2
export const THREAD_STREAM_META_DATA_PAYLOAD_DIVIDER_INDEX = 3
