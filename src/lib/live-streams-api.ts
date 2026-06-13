import api from '@/lib/api';

export type LiveStreamMode = 'audio_only' | 'audio_video' | 'screen_share';
export type LiveStreamStatus = 'scheduled' | 'live' | 'ended' | 'recorded' | string;
export type LiveStreamStartType = 'now' | 'scheduled';
export type LiveRoomRole = 'host' | 'viewer' | string;

export type LiveRoomMediaState = {
  camera_on: boolean;
  mic_on: boolean;
  screen_share_on: boolean;
};

export type LiveRoomMediaPermissions = {
  can_publish_audio: boolean;
  can_publish_video: boolean;
  can_share_screen: boolean;
};

export type LiveRoomParticipant = {
  socket_id: string;
  user_id: number;
  name: string;
  can_publish: boolean;
  role_in_room: LiveRoomRole;
  media_permissions: LiveRoomMediaPermissions;
  media_state: LiveRoomMediaState;
};

export type LiveSpeakingRequest = {
  id: string;
  stream_id: number;
  student: {
    socket_id: string;
    user_id: number;
    name: string;
  };
  status: 'pending' | 'accepted' | 'rejected' | string;
  created_at: string;
  resolved_at: string | null;
  resolved_by: number | null;
};

export type LiveRoomJoinAck =
  | {
      ok: true;
      room_name: string;
      stream_id: number;
      participant: LiveRoomParticipant;
      can_publish: boolean;
      role_in_room: LiveRoomRole;
      media_permissions: LiveRoomMediaPermissions;
      media_defaults: {
        host_camera_on: boolean;
        host_mic_on: boolean;
      };
      peers: LiveRoomParticipant[];
      pending_speaking_requests: LiveSpeakingRequest[];
    }
  | {
      ok: false;
      error: string;
    };

export type CourseLiveStream = {
  id: number;
  course_id: number;
  host_user_id: number;
  title: string;
  description: string | null;
  scheduled_at: string;
  started_at: string | null;
  ended_at: string | null;
  stream_mode: LiveStreamMode;
  status: LiveStreamStatus;
  room_name: string;
  recording_url: string | null;
  host_camera_on: boolean;
  host_mic_on: boolean;
  created_at: string;
  updated_at: string;
};

export type CreateLiveStreamPayload = {
  course_id: number;
  title: string;
  description?: string | null;
  start_type?: LiveStreamStartType;
  scheduled_at?: string;
  stream_mode?: LiveStreamMode;
  host_camera_on?: boolean;
  host_mic_on?: boolean;
};

export type CreateCourseLiveSessionPayload = {
  title: string;
  description?: string | null;
};

export type UpdateLiveStreamPayload = {
  title?: string;
  description?: string | null;
  scheduled_at?: string;
  stream_mode?: LiveStreamMode;
  host_camera_on?: boolean;
  host_mic_on?: boolean;
};

export type LiveStreamJoinInfo = {
  connection_mode: 'socket_webrtc' | 'hybrid' | string;
  room_name: string;
  stream_id: number;
  participant_identity: string;
  can_publish: boolean;
  media_defaults: {
    host_camera_on: boolean;
    host_mic_on: boolean;
  };
  signaling: {
    type: string;
    namespace: string;
    path: string;
    join_event: string;
    signal_event: string;
    leave_event: string;
    note?: string;
  };
  livekit: {
    url: string;
    token: string;
    room_name: string;
    participant_identity: string;
    can_publish: boolean;
  } | null;
};

export async function fetchCourseLiveStreams(courseId: number): Promise<CourseLiveStream[]> {
  const { data } = await api.get<{ streams: CourseLiveStream[] }>(
    `/api/courses/${courseId}/live-streams`
  );
  return data.streams ?? [];
}

export async function createCourseLiveSession(
  courseId: number,
  payload: CreateCourseLiveSessionPayload
): Promise<CourseLiveStream> {
  const { data } = await api.post<{ stream: CourseLiveStream }>(
    `/api/courses/${courseId}/live-streams`,
    payload
  );
  return data.stream;
}

export async function createLiveStream(
  payload: CreateLiveStreamPayload
): Promise<CourseLiveStream> {
  const { data } = await api.post<{ stream: CourseLiveStream }>(
    '/api/live-streams',
    payload
  );
  return data.stream;
}

export async function updateLiveStream(
  streamId: number,
  payload: UpdateLiveStreamPayload
): Promise<CourseLiveStream> {
  const { data } = await api.patch<{ stream: CourseLiveStream }>(
    `/api/live-streams/${streamId}`,
    payload
  );
  return data.stream;
}

export async function startLiveStream(streamId: number): Promise<CourseLiveStream> {
  const { data } = await api.post<{ stream: CourseLiveStream }>(
    `/api/live-streams/${streamId}/start`,
    {}
  );
  return data.stream;
}

export async function endLiveStream(streamId: number): Promise<CourseLiveStream> {
  const { data } = await api.post<{ stream: CourseLiveStream }>(
    `/api/live-streams/${streamId}/end`,
    {}
  );
  return data.stream;
}

export async function fetchLiveStreamJoinInfo(streamId: number): Promise<LiveStreamJoinInfo> {
  const { data } = await api.post<LiveStreamJoinInfo>(
    `/api/live-streams/${streamId}/join-token`,
    {}
  );
  return data;
}
