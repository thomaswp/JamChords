const OnSong = require('onsong');

//requiring path and fs modules
const path = require('path');
const fs = require('fs');

const languageEncoding = require("detect-file-encoding-and-language");

//joining path of directory
const directoryPath = path.join(__dirname, '../../data');

function parseSong(text) {
    let lines = text.split('\n');
    let title = lines[0].trim();
    let metadata = '';
    let i = 1;
    for (; i < lines.length; i++) {
        let line = lines[i];
        if (line.length == 0) break;
        if (metadata.length > 0) metadata += '\n';
        metadata += line.trim();
    }
    while (i < lines.length && lines[i].length == 0) i++;

    let content = lines.splice(i).join('\n').trim();

    // console.log(title, metadata, text);
    return {
        title,
        metadata,
        content,
    }
}

async function readSongs() {
    console.log("!", directoryPath);
    //passsing directoryPath and callback function
    let files = fs.readdirSync(directoryPath);
    console.log(files);
    //listing all files using forEach
    let songs = [];
    for (let file of files) {
        if (!file.endsWith('.onsong')) return;
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
            songs.push(parseSong(text));
        } catch (e) {
            console.error('Failed to parse', e);
        }
    }

    return songs;
}

(async () => {
    let songs = await readSongs();
    // let js = 'export const songs = ' + JSON.stringify(songs);

    fs.writeFileSync(path.join(__dirname, '../data/Songs.json'), JSON.stringify(songs, null, 4));
})();