//requiring path and fs modules
const path = require('path');
const fs = require('fs');

const languageEncoding = require("detect-file-encoding-and-language");

//joining path of directory
const directoryPaths = [
    'PackPickers',
    'PullenPickers',
];

function parseSong(text) {
    text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    let lines = text.split('\n');
    let title = lines[0].trim();
    let metadata = '';
    let i = 1;
    if (title === 'Columbus Stockade') {
        console.log(text);
    }
    for (; i < lines.length; i++) {
        let line = lines[i];
        if (line.trim().length == 0) break;
        if (metadata.length > 0) metadata += '\n';
        metadata += line.trim();
    }
    let content = '';
    if ((metadata.match(/\[([A-Ga-gmb#74]+)\]/g) || []).length > 1) {
        content += metadata + '\n';
        metadata = '';
    } else {
        if (metadata.split('\n').length > 2) {
            console.log(metadata);
        }
        while (i < lines.length && lines[i].length == 0) i++;
    }

    content += lines.splice(i).map(line => line.trim()).join('\n').trim();

    // console.log(title, metadata, text);
    return {
        title,
        metadata,
        content,
    }
}

async function readSongs(directoryPath, category) {
    console.log("!", directoryPath);
    //passsing directoryPath and callback function
    let files = fs.readdirSync(directoryPath);
    console.log(files);
    //listing all files using forEach
    let songs = [];
    for (let file of files) {
        if (!file.endsWith('.onsong') && !file.endsWith('.txt')) return;
        let newPath = path.join(directoryPath, file);
        const enc = await languageEncoding(newPath);
        // console.log(file);
        // console.log(enc);
        let data = fs.readFileSync(newPath, {encoding: enc.encoding});
        try {
            let text = data.toString();
            // let song = OnSong.parse(data.toString());
            // song.sections.forEach(s => {
            //     s.items.forEach(i => i.lines.forEach(p => p.parts.forEach(console.log)));
            // });
            // console.log(song.metadata.title);
            let song = parseSong(text);
            song.category = category;
            songs.push(song);
        } catch (e) {
            console.error('Failed to parse', e);
        }
    }

    return songs;
}

(async () => {
    let allSongs = [];
    for (let directoryPath of directoryPaths) {
        let songs = await readSongs(path.join(__dirname, '../../data', directoryPath), directoryPath);
        allSongs = allSongs.concat(songs);
    }
    allSongs.sort((a, b) => a.title.localeCompare(b.title));
    // let js = 'export const songs = ' + JSON.stringify(songs);

    // make directories
    const dataDir = path.join(__dirname, '../data');
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir);
    fs.writeFileSync(path.join(dataDir, 'Songs.json'), JSON.stringify(allSongs, null, 4));
})();