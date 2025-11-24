// DOM 요소 가져오기
const audioPlayer = document.getElementById('audioPlayer');
const remoteList = document.getElementById('remoteList');
const lyricsContent = document.getElementById('lyricsContent');
const playPauseBtn = document.getElementById('playPauseBtn');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const progressBar = document.getElementById('progressBar');
const volumeBar = document.getElementById('volumeBar');
// volumeValue removed - icon-only UI
const currentTimeDisplay = document.getElementById('currentTime');
const durationDisplay = document.getElementById('duration');
const trackTitle = document.getElementById('trackTitle');
const trackArtist = document.getElementById('trackArtist');
const vinylRecord = document.getElementById('vinylRecord');

// 플레이리스트 데이터
let tracks = [];
let lyricsMap = new Map(); // 곡 이름 -> 가사 텍스트 매핑
let lyricsLines = []; // 현재 가사의 줄 배열
let currentTrackIndex = -1;
let isPlaying = false;
let currentLyricIndex = -1; // 현재 하이라이트된 가사 줄 인덱스

// music 폴더의 mp3 파일 목록
const musicFiles = [
    "track1_재사용 만렙 컴포넌트, EJS에 심다 (feat. 김다인, 이미연, 박정인).mp3",
    "track2_Canvas 너머 3D 웹지피유, 어디까지 가봤니 (by 오지원).mp3",
    "track3_FPS 킬러 캔버스 성능, Pixi로 역전! (with 문유라).mp3",
    "track4_내 최애 레이어 커마 장인의 상태관리 (Prod. 문채민).mp3",
    "track5_JS의 진화론 타입 없는 세상은 위험해 (from 한범규).mp3",
    "track6_'will-change'의 역설 브라우저가 더 빨라 (by 김은정).mp3"
];

// music 폴더에서 트랙 로드
async function loadMusicTracks() {
    tracks = [];
    
    for (const fileName of musicFiles) {
        const trackName = fileName.replace(/\.mp3$/i, '');
        const track = {
            name: trackName,
            url: `music/${fileName}`
        };
        tracks.push(track);
        
        // 같은 이름의 txt 파일 가사 로드 시도
        try {
            const response = await fetch(`music/${trackName}.txt`);
            if (response.ok) {
                const lyricsText = await response.text();
                lyricsMap.set(trackName, lyricsText);
            }
        } catch (error) {
            // 가사 파일이 없으면 무시
        }
    }
    
    renderRemotePlaylist();
    if (tracks.length > 0 && currentTrackIndex === -1) {
        loadTrack(0);
    }
}

// 리모컨 플레이리스트 렌더링
function renderRemotePlaylist() {
    remoteList.innerHTML = '';
    tracks.forEach((track, index) => {
        const item = document.createElement('div');
        item.className = 'remote-item';
        if (index === currentTrackIndex) {
            item.classList.add('active');
        }
        // 파일명에서 track 번호와 제목 추출 (track1_제목 형식)
        const match = track.name.match(/^track(\d+)_(.+?)(\.mp3)?$/i);
        const number = match ? match[1] : (index + 1).toString();
        const title = match ? match[2] : track.name.replace(/\.mp3$/i, '');
        
        item.innerHTML = `
            <div class="remote-item-number">${number}</div>
            <div class="remote-item-title">${title}</div>
        `;
        item.addEventListener('click', () => {
            loadTrack(index);
            if (isPlaying) {
                play();
            }
        });
        remoteList.appendChild(item);
    });
}

// 트랙 로드
function loadTrack(index) {
    if (index < 0 || index >= tracks.length) return;
    
    currentTrackIndex = index;
    const track = tracks[index];
    
    audioPlayer.src = track.url;
    trackTitle.textContent = track.name;
    trackArtist.textContent = '';
    
    // 리모컨 플레이리스트 업데이트
    renderRemotePlaylist();
    
    // 가사 로드 및 표시
    loadLyrics(track.name);
    
    // 레코드 판 상태 업데이트
    if (vinylRecord) {
        if (isPlaying) {
            vinylRecord.classList.add('playing');
            vinylRecord.classList.remove('paused');
        } else {
            vinylRecord.classList.remove('playing');
            vinylRecord.classList.add('paused');
        }
    }
    
    // 메타데이터 로드 후 정보 업데이트
    audioPlayer.addEventListener('loadedmetadata', () => {
        updateDuration();
    }, { once: true });
}

// 가사 로드
async function loadLyrics(trackName) {
    // 먼저 메모리에 있는 가사 확인
    if (lyricsMap.has(trackName)) {
        displayLyrics(lyricsMap.get(trackName));
        return;
    }
    
    // music 폴더에서 같은 이름의 txt 파일 찾기 시도
    try {
        const response = await fetch(`music/${trackName}.txt`);
        if (response.ok) {
            const lyricsText = await response.text();
            lyricsMap.set(trackName, lyricsText);
            displayLyrics(lyricsText);
        } else {
            displayLyrics(null);
        }
    } catch (error) {
        // 파일이 없거나 로드 실패 시
        displayLyrics(null);
    }
}

// 가사 표시
function displayLyrics(lyricsText) {
    if (lyricsText) {
        // 가사를 줄 단위로 분리
        lyricsLines = lyricsText
            .split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0);
        
        // 초기 인덱스 설정 (첫 번째 줄)
        currentLyricIndex = lyricsLines.length > 0 ? 0 : -1;
        
        // 3줄만 표시하도록 렌더링
        renderLyricsLines();
    } else {
        lyricsContent.innerHTML = '<p class="lyrics-placeholder">No lyrics available. Please select a lyrics file (.txt) or place a txt file with the same name as the music file in the music folder.</p>';
        lyricsLines = [];
        currentLyricIndex = -1;
    }
}

// 가사 3줄 렌더링 (현재 선택된 줄 기준)
function renderLyricsLines() {
    if (lyricsLines.length === 0 || currentLyricIndex < 0) {
        lyricsContent.innerHTML = '';
        return;
    }
    
    // 페이드 아웃 효과
    lyricsContent.style.opacity = '0';
    
    // 짧은 지연 후 새 내용 렌더링
    setTimeout(() => {
        // 현재 인덱스 기준으로 위 1줄, 현재 줄, 아래 1줄 (총 3줄)
        const startIndex = Math.max(0, currentLyricIndex - 1);
        const endIndex = Math.min(lyricsLines.length, currentLyricIndex + 2);
        
        let html = '';
        for (let i = startIndex; i < endIndex; i++) {
            const isActive = i === currentLyricIndex;
            html += `<div class="lyric-line ${isActive ? 'active' : ''}" data-index="${i}">${lyricsLines[i]}</div>`;
        }
        
        lyricsContent.innerHTML = html;
        
        // 페이드 인 효과
        setTimeout(() => {
            lyricsContent.style.opacity = '1';
        }, 10);
    }, 150);
}

// 가사 위로 이동
function moveLyricsUp() {
    if (lyricsLines.length === 0) return;
    if (currentLyricIndex > 0) {
        currentLyricIndex--;
        renderLyricsLines();
    }
}

// 가사 아래로 이동
function moveLyricsDown() {
    if (lyricsLines.length === 0) return;
    if (currentLyricIndex < lyricsLines.length - 1) {
        currentLyricIndex++;
        renderLyricsLines();
    }
}

// 재생/일시정지
function togglePlayPause() {
    if (currentTrackIndex === -1) return;
    
    if (isPlaying) {
        pause();
    } else {
        play();
    }
}

function play() {
    audioPlayer.play();
    isPlaying = true;
    playPauseBtn.textContent = '⏸';
    playPauseBtn.title = 'Pause';
    if (vinylRecord) {
        vinylRecord.classList.add('playing');
        vinylRecord.classList.remove('paused');
    }
}

function pause() {
    audioPlayer.pause();
    isPlaying = false;
    playPauseBtn.textContent = '▶';
    playPauseBtn.title = 'Play';
    if (vinylRecord) {
        vinylRecord.classList.remove('playing');
        vinylRecord.classList.add('paused');
    }
}

// 이전 곡
function playPrevious() {
    if (tracks.length === 0) return;
    const prevIndex = currentTrackIndex > 0 ? currentTrackIndex - 1 : tracks.length - 1;
    loadTrack(prevIndex);
    if (isPlaying) {
        play();
    }
}

// 다음 곡
function playNext() {
    if (tracks.length === 0) return;
    const nextIndex = currentTrackIndex < tracks.length - 1 ? currentTrackIndex + 1 : 0;
    loadTrack(nextIndex);
    if (isPlaying) {
        play();
    }
}

// 진행 바 업데이트
function updateProgress() {
    if (audioPlayer.duration) {
        const progress = (audioPlayer.currentTime / audioPlayer.duration) * 100;
        progressBar.value = progress;
        updateTimeDisplay();
    }
}

// 시간 표시 업데이트
function updateTimeDisplay() {
    const current = formatTime(audioPlayer.currentTime);
    const duration = formatTime(audioPlayer.duration || 0);
    currentTimeDisplay.textContent = current;
    durationDisplay.textContent = duration;
}

// 시간 포맷팅
function formatTime(seconds) {
    if (isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// 진행 바 조절
function seekTo(event) {
    if (!audioPlayer.duration) return;
    const seekTime = (event.target.value / 100) * audioPlayer.duration;
    audioPlayer.currentTime = seekTime;
}

// 볼륨 조절
function setVolume(event) {
    const volume = event.target.value / 100;
    audioPlayer.volume = volume;
    
    // 볼륨 아이콘 업데이트
    const volumeIcon = document.querySelector('.volume-icon');
    if (volume === 0) {
        volumeIcon.textContent = '🔇';
    } else if (volume < 0.5) {
        volumeIcon.textContent = '🔉';
    } else {
        volumeIcon.textContent = '🔊';
    }
}

// 초기 볼륨 설정
audioPlayer.volume = 0.7;
volumeBar.value = 70;

// 이벤트 리스너
playPauseBtn.addEventListener('click', togglePlayPause);
prevBtn.addEventListener('click', playPrevious);
nextBtn.addEventListener('click', playNext);

progressBar.addEventListener('input', seekTo);
volumeBar.addEventListener('input', setVolume);

// 오디오 이벤트
audioPlayer.addEventListener('timeupdate', updateProgress);
audioPlayer.addEventListener('ended', () => {
    if (vinylRecord) {
        vinylRecord.classList.remove('playing');
        vinylRecord.classList.add('paused');
    }
    playNext();
});

audioPlayer.addEventListener('loadedmetadata', () => {
    updateDuration();
});

function updateDuration() {
    durationDisplay.textContent = formatTime(audioPlayer.duration);
}

// 키보드 단축키
document.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
        e.preventDefault();
        togglePlayPause();
    } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        playPrevious();
    } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        playNext();
    } else if (e.code === 'ArrowUp') {
        e.preventDefault();
        moveLyricsUp();
    } else if (e.code === 'ArrowDown') {
        e.preventDefault();
        moveLyricsDown();
    }
});

// 모바일 터치 이벤트 (가사 이동)
let touchStartY = 0;
let touchEndY = 0;
const minSwipeDistance = 50; // 최소 스와이프 거리 (픽셀)

lyricsContent.addEventListener('touchstart', (e) => {
    touchStartY = e.touches[0].clientY;
}, { passive: true });

lyricsContent.addEventListener('touchend', (e) => {
    touchEndY = e.changedTouches[0].clientY;
    const swipeDistance = touchStartY - touchEndY;
    
    // 위로 스와이프 (touchStartY > touchEndY, 양수)
    if (swipeDistance > minSwipeDistance) {
        e.preventDefault();
        moveLyricsUp();
    }
    // 아래로 스와이프 (touchStartY < touchEndY, 음수)
    else if (swipeDistance < -minSwipeDistance) {
        e.preventDefault();
        moveLyricsDown();
    }
}, { passive: false });

// 초기 버튼 상태
prevBtn.disabled = true;
nextBtn.disabled = true;
playPauseBtn.disabled = true;

// 트랙이 로드되면 버튼 활성화
audioPlayer.addEventListener('loadeddata', () => {
    if (tracks.length > 0) {
        prevBtn.disabled = false;
        nextBtn.disabled = false;
        playPauseBtn.disabled = false;
    }
});

// 페이지 로드 시 music 폴더에서 트랙 로드
loadMusicTracks();

