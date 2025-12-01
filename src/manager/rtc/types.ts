import {
  UID,
  IAgoraRTCRemoteUser,
  IAgoraRTCClient,
  ICameraVideoTrack,
  IMicrophoneAudioTrack,
  ILocalScreenVideoTrack,
  IRemoteVideoTrack,
  NetworkQuality,
} from "agora-rtc-sdk-ng"
import { ITextstream } from "../parser"

export interface IRtcUser extends IUserTracks {
  userId: UID
}

export interface RtcEvents {
  remoteUserChanged: (user: IRtcUser) => void
  localUserChanged: (tracks: IUserTracks) => void
  networkQuality: (quality: NetworkQuality) => void
  textstreamReceived: (textstream: ITextstream) => void
}

export interface IUserTracks {
  videoTrack?: ICameraVideoTrack | IRemoteVideoTrack
  audioTrack?: IMicrophoneAudioTrack
  screenTrack?: ILocalScreenVideoTrack | IRemoteVideoTrack
}
