import songs from '../data/Songs.json'

interface Song {
    title: string; metadata: string; content: string;
}

function switchToSong(song: Song) {
    document.getElementById('title').innerHTML = song.title;
    document.getElementById('metadata').innerHTML = song.metadata;
    document.getElementById('content').innerHTML = song.content;
    (<HTMLInputElement>document.getElementById('transpose')).value = '0';
    activateChords();
}

function activateChords() {
    let content = document.getElementById('content');
    let html = content.innerHTML;
    html = html.replace(/\[([A-Ga-gmb#74]+)\]/g, "<span class='chord'>[<span class='chord-name' data-chord='$1'>$1</span>]</span>");
    content.innerHTML = html;

    setKey();
}

function setKey() {
    let offset = parseInt((<HTMLInputElement>document.getElementById('transpose')).value);
    document.querySelectorAll('.chord-name').forEach((node: HTMLElement) => {
        let chord = node.dataset.chord;
        console.log(chord, chordToSteps(chord));
        node.innerHTML = transposeChord(chord, offset);
    });
}

const chordMap = new Map(Object.entries({
    'C': 1,
    'C#': 2,
    'Db': 2,
    'D': 3,
    'D#': 4,
    'Eb': 4,
    'E': 5,
    'F': 6,
    'F#': 7,
    'Gb': 7,
    'G': 8,
    'G#': 9,
    'Ab': 9,
    'A': 10,
    'A#': 11,
    'Bb': 11,
    'B': 12,
}));

function getRoot(chord: string) {
    chord = chord.replace('♯', '#').replace('♭', 'b');
    let matches = chord.match(/^[A-Ga-g][#b]?/);
    if (matches.length == 0) return null;
    return matches[0];
}

function transposeChord(chord: string, steps: number) {
    let root = chordToSteps(chord);
    root = root + steps;
    while (root < 1) root += 12;
    root = ((root - 1) % 12) + 1;
    for (let [k, v] of chordMap.entries()) {
        if (root == v) {
            return k + chord.substring(chord.length);
        }
    }

}

function chordToSteps(chord: string) {
    let root = getRoot(chord);
    if (!root) return null;
    root = root[0].toUpperCase() + (root.length > 1 ? root[1].toLowerCase() : '');
    if (chordMap.has(root)) return chordMap.get(root);
    console.error('Unknown chord: ', root);
    return null;
}

export function init() {
    let list = document.querySelector('.scrollarea');
    let activeItem = null;
    songs.forEach(song => {
        // console.log(song);
        let link = document.getElementById('sidebar-item-template').cloneNode(true) as HTMLAnchorElement;
        link.id = null;
        link.classList.remove('hidden');
        link.classList.remove('active');
        link.querySelector(".list-item-title").innerHTML = song.title;
        link.querySelector(".list-item-description").innerHTML = song.metadata;
        link.href = '#';
        link.onclick = () => {
            if (activeItem) {
                activeItem.ariaCurrent = "false";
                activeItem.classList.remove('active');
            }
            activeItem = link;
            link.ariaCurrent = "true";
            link.classList.add('active');
            switchToSong(song);
        }
        list.appendChild(link);
        if (activeItem == null) {
            link.click();
        }
    });

    document.getElementById('transpose').onchange = (e) => {
        setKey();
    };
}