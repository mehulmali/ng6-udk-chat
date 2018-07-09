import { AfterViewInit, Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { SocketService } from '../../common/services/socket/socket.service';
import { AuthService } from '../../common/services/auth/auth.service';
import { Router } from '@angular/router';
import * as _ from 'lodash';


@Component({
  selector: 'app-video',
  templateUrl: './video.component.html',
  styleUrls: ['./video.component.css']
})
export class VideoComponent implements OnInit, AfterViewInit {

  public localVideo;
  public remoteVideo;
  public user;
  public chatMessage;
  public localStream: MediaStream;
  public remoteStream: MediaStream;
  @Output() EventShowVideo: any = new EventEmitter<any>();
  public rtcPeerConnection;
  @Input() selectedUser: any;
  iceServers: any;
  public isHangUp: boolean;


  constructor(private socketService: SocketService, private authService: AuthService, private router: Router) {
    this.user = authService.getAuthUser();
    this.chatMessage = '';
    this.isHangUp = true;
    this.iceServers = {
      'iceServers': [
        {
          'url': 'stun:stun.services.mozilla.com'
        },
        {
          'url': 'stun:stun.l.google.com:19302'
        }
      ]
    };
  }

  ngOnInit() {
    const constraints = {
      video: true,
      audio: true,
    };

    navigator.mediaDevices.getUserMedia(constraints).then((stream) => {
      this.getUserMediaSuccess(stream);
    });
  }

  getUserMediaSuccess = (stream) => {
    console.log('stream', stream);
    this.localStream = stream;
    this.localVideo.src = window.URL.createObjectURL(stream);
    if (stream.getAudioTracks().length > 0) {
      console.log('in');
    }
  }

  ngAfterViewInit() {

    this.localVideo = document.getElementById('localVideo');
    this.remoteVideo = document.getElementById('remoteVideo');

    this.socketService.receiveOfferResponse().subscribe((data: any) => {
      if (!this.rtcPeerConnection) {
        this.start(false);
      }
      this.rtcPeerConnection.setRemoteDescription(new RTCSessionDescription(data.sdp));
        this.rtcPeerConnection.createAnswer()
          .then(desc => this.setLocalAndAnswer(desc))
          .catch(e => console.log(e));
    });

    this.socketService.receiveAnswerResponse().subscribe((data: any) => {
      this.rtcPeerConnection.setRemoteDescription(new RTCSessionDescription(data.sdp));
    });

    this.socketService.receiveHangupResponse().subscribe((data: any) => {
      this.isHangUp = true;
      this.closeVideoCall();

    });

    this.socketService.receiveCandidateResponse().subscribe((data: any) => {
      const candidate = new RTCIceCandidate({
        sdpMLineIndex: data.label,
        candidate: data.candidate
      });
      this.rtcPeerConnection.addIceCandidate(candidate);
    });
  }

  start = (isCaller) => {

    this.isHangUp = false;
    this.createPeerConnection();
    const offerOptions = {
      offerToReceiveAudio: 1,
      offerToReceiveVideo: 1,
    };
    if (isCaller) {
      this.rtcPeerConnection.createOffer(offerOptions)
        .then(desc => this.setLocalAndOffer(desc))
        .catch(e => console.log(e));
    }
  }


  createPeerConnection = () => {
    this.rtcPeerConnection = new RTCPeerConnection(this.iceServers);
    this.rtcPeerConnection.onicecandidate = this.onIceCandidate;
    this.rtcPeerConnection.onaddstream = this.onAddStream;
    this.rtcPeerConnection.addStream(this.localStream);
  }

  onAddStream = (event) => {
    this.remoteVideo.src = URL.createObjectURL(event.stream);
    this.remoteStream = event.stream;
    if (this.remoteStream.getAudioTracks().length > 0) {
      console.log('Remote user is sending Audio');
    } else {
      console.log('Remote user is not sending Audio');
    }
  }

  setLocalAndOffer = (sessionDescription) => {
    this.rtcPeerConnection.setLocalDescription(sessionDescription);
    const data = {
      type: 'offer',
      fromUserId: this.user.id,
      sdp: sessionDescription,
      toUserId: this.selectedUser.id
    };

    this.socketService.startOffer(data);
  }

  setLocalAndAnswer = (sessionDescription) => {
    this.rtcPeerConnection.setLocalDescription(sessionDescription);
    const data = {
      type: 'answer',
      fromUserId: this.user.id,
      sdp: sessionDescription,
      toUserId: this.selectedUser.id
    };

    this.socketService.startAnswer(data);

  }

  onIceCandidate = (event) => {
    if (event.candidate) {
      const data = {
        type: 'candidate',
        label: event.candidate.sdpMLineIndex,
        id: event.candidate.sdpMid,
        candidate: event.candidate.candidate,
        toUserId: this.selectedUser.id,
        fromUserId: this.user.id,
      };
      this.socketService.startCandidate(data);
    }
  }

  fnShowChat(type: string) {
    this.EventShowVideo.next(type);
  }

  hangUpCall = () => {
    this.closeVideoCall();
    const data = {
      type: 'hang-up',
      toUserId: this.selectedUser.id,
      fromUserId: this.user.id,
    };
    this.isHangUp = true;
    this.socketService.hangUp(data);
  }


  closeVideoCall = () => {

    if (this.rtcPeerConnection) {
      if (this.remoteVideo.src) {
        this.remoteVideo.src = null;
      }

      this.rtcPeerConnection.close();
      this.rtcPeerConnection = null;
    }
  }

}
