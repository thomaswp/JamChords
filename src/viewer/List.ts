import songs from '../data/Songs.json'

let textColumns: number = null;

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
    setTextSize();
    setKeyData();
    setKey();
}

const chordData = {
    majors: [1, 0, 0, 1, 1, 0, 1],
    weights: [1, 0.5, 0.25, 0.9, 0.9, 0.9, 0],
    steps: [0, 2, 4, 5, 7, 9, 11],
};

function keyScore(keySteps: number, chordList: string[]) {
    let score = 0;
    let first = null;
    chordList.forEach(chord => {
        let step = parseInt(chord.replace('m', ''));
        step -= keySteps + 1; // 0-indexed
        while (step < 0) step += 12;
        step %= 12;
        if (first == null) first = step;
        let index = chordData.steps.indexOf(step);
        // console.log(step, index, chordData.majors[index], chordData.weights[index], score);
        if (index < 0) {
            score -= 1;
            return;
        }
        let major = chordData.majors[index];
        if (major != (chord.includes('m') ? 0 : 1)) {
            score -= 0.5;
            return;
        }
        score += chordData.weights[index];
    });
    // The first chord is a good indicator of the chord,
    // in case of near-ties
    // console.log(keySteps, first);
    if (first == 0) score *= 1.2;
    return score;
}

function guessKey() {
    let chordList = [] as string[];
    document.querySelectorAll('.chord-name').forEach((node: HTMLElement) => {
        let chord = node.dataset.chord;
        let step = chordToSteps(chord);
        // let root = getRoot(chord);
        // let suffix = chord.substring(root.length);
        let suffix = chord.includes('m') ? 'm' : '';
        chordList.push(step + suffix);
    });
    // console.log(chordList);
    let scores = [...Array(12).keys()].map(step => {
        let score = keyScore(step, chordList);
        // console.log(getKeyNameForStep(step + 1), score);
        return score;
    });
    return argMax(scores) + 1; // 1-indexed
}

function argMax(array) {
    return array.map((x, i) => [x, i]).reduce((r, a) => (a[0] > r[0] ? a : r))[1];
}

function setKeyData() {
    let key = guessKey();
    // console.log(key);
    document.getElementById('key-guess').dataset.baseKey = key;
    document.querySelectorAll('.chord-name').forEach((node: HTMLElement) => {
        let chord = node.dataset.chord;
        let steps = chordToSteps(chord);
        steps = (steps - key + 12) % 12 + 1; // 1-indexed
        node.dataset.steps = '' + steps;
    });
}

function setKey() {
    let offset = parseInt((<HTMLInputElement>document.getElementById('transpose')).value);
    let keyGuess = document.getElementById('key-guess');
    let offsetKey = (parseInt(keyGuess.dataset.baseKey) + offset + 12 - 1) % 12 + 1;
    // console.log(keyGuess.dataset.baseKey, offsetKey);
    keyGuess.innerHTML = getKeyNameForStep(offsetKey);
    let isNashville = document.getElementById('button-number').classList.contains('active');
    document.querySelectorAll('.chord-name').forEach((node: HTMLElement) => {
        let chord = node.dataset.chord;
        let steps = null;
        try {
            steps = parseInt(node.dataset.steps);
        } catch {}
        let chordNumber = chordData.steps.indexOf(steps - 1) + 1;
        if (chordNumber > 0 && isNashville) {
            let suffix = chord.substring(getRoot(chord).length);
            if (/[0-9]/.test(suffix[0])) {
                suffix = '-' + suffix;
            }
            node.innerHTML = chordNumber + suffix;
        } else {
            node.innerHTML = transposeChord(chord, offset);
        }
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

function getKeyNameForStep(root: number) {
    for (let [k, v] of chordMap.entries()) {
        if (root == v) {
            return k;
        }
    }
}

function transposeChord(chord: string, steps: number) {
    let suffix = chord.substring(getRoot(chord).length);
    let root = chordToSteps(chord);
    root = root + steps;
    while (root < 1) root += 12;
    root = ((root - 1) % 12) + 1;
    return getKeyNameForStep(root) + suffix;
}

function chordToSteps(chord: string) {
    let root = getRoot(chord);
    if (!root) return null;
    root = root[0].toUpperCase() + (root.length > 1 ? root[1].toLowerCase() : '');
    if (chordMap.has(root)) return chordMap.get(root);
    console.error('Unknown chord: ', root);
    return null;
}

function setTextSize() {
    let content = document.getElementById('content');
    let size = parseInt((document.getElementById('text-size') as HTMLInputElement).value);
    content.style.fontSize = (size / 14) + 'rem';

    let actualSize = parseFloat(getComputedStyle(content).fontSize);
    // console.log(size, actualSize);

    if (textColumns != null) {
        content.classList.toggle('twoColumn', textColumns == 2);
        return;
    }

    let song = document.getElementById('song') as HTMLElement;
    let width = song.offsetWidth;

    let maxLength = 0;
    let lyrics = content.innerText;
    let lines = lyrics.split('\n').filter(l => l.length > 0);
    if (lines.length > 0) {
        maxLength = lines.map(l => l.length).reduce((a, b) => Math.max(a, b), 0);
    }

    let estColumnSize = 0.43 * actualSize * maxLength;
    // console.log(estColumnSize, width);
    // If 2 columns (plus 1.2x buffer) are larger than width, set to 1-column mode
    content.classList.toggle('twoColumn', estColumnSize * 2 * 1.2 < width);
}

function isMobile() {
    let check = false;
    (function (a) { if (/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino/i.test(a) || /1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(a.substr(0, 4))) check = true; })(navigator.userAgent || navigator.vendor);
    return check;
};

function populateSongs() {
    let categories = [];
    document.querySelectorAll('.category-button').forEach(element => {
        let button = <HTMLInputElement>element;
        let category = button.dataset.category;
        let checked = button.checked;
        if (checked) categories.push(category);
    });

    let list = document.querySelector('.scrollarea');
    list.innerHTML = '';
    let activeItem = null;
    let hashTitle = decodeURI(document.location.hash.substring(1));
    songs.forEach(song => {
        if (categories.length > 0 && !categories.includes(song.category)) return;
        // console.log(song);
        let link = document.getElementById('sidebar-item-template').cloneNode(true) as HTMLAnchorElement;
        link.id = null;
        link.classList.remove('hidden');
        link.classList.remove('active');
        link.querySelector(".list-item-title").innerHTML = song.title;
        let metadata = song.metadata || '';
        let maxLength = 50;
        if (metadata.length > maxLength) metadata = metadata.substring(0, maxLength) + '...';
        link.querySelector(".list-item-description").innerHTML = metadata;
        link.href = '#';
        link.onclick = (e) => {
            document.location.hash = song.title;
            if (activeItem) {
                activeItem.ariaCurrent = "false";
                activeItem.classList.remove('active');
            }
            activeItem = link;
            link.ariaCurrent = "true";
            link.classList.add('active');
            switchToSong(song);
            return false;
        }
        list.appendChild(link);
        if (hashTitle.length < 2 && activeItem == null) {
            link.click();
        }
        if (hashTitle === song.title) {
            link.scrollIntoView();
            link.click();
        }
    });
}

export function init() {
    populateSongs();    

    document.querySelectorAll('.category-button').forEach(element => {
        let button = <HTMLInputElement>element;
        button.onclick = () => {
            populateSongs();
        }
    });

    let textSize = document.getElementById('text-size') as HTMLInputElement;
    let maxFont = parseInt(textSize.getAttribute('max'));
    let minFont = parseInt(textSize.getAttribute('min'));
    textSize.onchange = (e) => {
        setTextSize();
    };
    document.getElementById('text-plus').onclick = () => {
        textSize.value = "" + Math.min(parseInt(textSize.value) + 1, maxFont);
        setTextSize();
    };
    document.getElementById('text-minus').onclick = () => {
        textSize.value = "" + Math.max(parseInt(textSize.value) - 1, minFont);
        setTextSize();
    };

    let transposeInput = document.getElementById('transpose') as HTMLInputElement;
    let maxKey = parseInt(transposeInput.getAttribute('max'));
    let minKey = parseInt(transposeInput.getAttribute('min'));
    let keyPlus = document.getElementById('key-plus') as HTMLInputElement;
    let keyMinus = document.getElementById('key-minus') as HTMLInputElement;
    transposeInput.onchange = (e) => {
        setKey();
    };
    keyPlus.onclick = () => {
        transposeInput.value = "" + Math.min(parseInt(transposeInput.value) + 1, maxKey);
        setKey();
    };
    keyMinus.onclick = () => {
        transposeInput.value = "" + Math.max(parseInt(transposeInput.value) - 1, minKey);
        setKey();
    };

    setupToggleButtons((button) => {
        let isABC = button.id == 'button-letter';
        transposeInput.disabled = !isABC;
        keyPlus.disabled = !isABC;
        keyMinus.disabled = !isABC;
        setKey();
    }, 'button-letter', 'button-number');

    setupToggleButtons((button) => {
        let cols = button.dataset.columns;
        textColumns = cols == null ? null : parseInt(cols);
        setTextSize();
    }, 'button-col-auto', 'button-col-1', 'button-col-2');

    new ResizeObserver(() => setTextSize()).observe(
        document.getElementById('content'));

    let closeButton = document.getElementById('close-button');
    closeButton.onclick = () => {
        closeButton.classList.toggle('bi-arrow-bar-left');
        closeButton.classList.toggle('bi-arrow-bar-right');
        document.getElementById('sidebar').classList.toggle('minimized');
    }
}

function setupToggleButtons(callback: (button: HTMLButtonElement) => void, ...ids: string[]) {
    let buttons = ids.map(id => document.getElementById(id)) as [HTMLButtonElement];
    buttons.forEach(current => current.onclick = () => {
        buttons.forEach(button => {
            let active = button == current;
            button.classList.toggle('active', active);
            button.ariaCurrent = active ? 'page' : '';
        });
        callback(current);
    });
}