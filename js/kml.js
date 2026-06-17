/* ══════════════════════════════════════════════════════════
   KML / Google Earth export
   ──────────────────────────────────────────────────────────
   Builds a KML document from the project's structured data
   (photos + landmarks) and triggers a browser download.

   The exported file opens directly in Google Earth (Pro,
   Web, or mobile) and any other KML-aware tool. Each
   placemark links back to the project's permalink so the
   document is a portable index, not a copy.

   Usage:  call downloadKML() — typically wired to a button
           in the Help panel.
   ══════════════════════════════════════════════════════════ */

(function () {
  // Project URL + attribution come from CONFIG so the KML stays self-describing
  // once exported (the permalinks remain valid even if the file is shared).
  var PROJECT_URL = (typeof CONFIG !== 'undefined' && CONFIG.site.baseUrl) || '';
  var ATTRIBUTION = (typeof CONFIG !== 'undefined' && CONFIG.kml && CONFIG.kml.attribution) || '';

  function escapeXml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  // CDATA needs special handling — anything inside ]]> would terminate the
  // section early, so split & re-wrap.
  function safeCdata(s) {
    return String(s == null ? '' : s).replace(/]]>/g, ']]]]><![CDATA[>');
  }

  function generateKML() {
    var lines = [];
    lines.push('<?xml version="1.0" encoding="UTF-8"?>');
    lines.push('<kml xmlns="http://www.opengis.net/kml/2.2">');
    lines.push('<Document>');
    lines.push('<name>' + escapeXml(CONFIG.kml.docName || CONFIG.site.title) + '</name>');
    lines.push('<description><![CDATA[' + safeCdata(
      (CONFIG.site.description || CONFIG.kml.docName || '') + '\n\n' +
      'Project: ' + PROJECT_URL + '\n\n' +
      ATTRIBUTION
    ) + ']]></description>');

    // Photo style — yellow camera icon from Google's stock KML icons
    lines.push('<Style id="photo">');
    lines.push('<IconStyle><scale>1.0</scale>');
    lines.push('<Icon><href>https://maps.google.com/mapfiles/kml/shapes/camera.png</href></Icon>');
    lines.push('</IconStyle></Style>');
    // Landmark style — info marker
    lines.push('<Style id="landmark">');
    lines.push('<IconStyle><scale>1.1</scale><color>ff5078a8</color>');
    lines.push('<Icon><href>https://maps.google.com/mapfiles/kml/shapes/info.png</href></Icon>');
    lines.push('</IconStyle></Style>');
    // Place (depopulated village) style — red dot
    lines.push('<Style id="place">');
    lines.push('<IconStyle><scale>0.9</scale><color>ff2b39c0</color>');
    lines.push('<Icon><href>https://maps.google.com/mapfiles/kml/shapes/donut.png</href></Icon>');
    lines.push('</IconStyle></Style>');

    // ── Photos folder ─────────────────────────────────────
    if (typeof photoInfo !== 'undefined' && photoInfo.length) {
      lines.push('<Folder><name>Photographs (' + photoInfo.length + ')</name>');
      lines.push('<description>Each photo links back to the same image on the live map at <a href="' + PROJECT_URL + '">' + PROJECT_URL + '</a>.</description>');
      photoInfo.forEach(function (p) {
        if (typeof p.lat !== 'number' || typeof p.lon !== 'number') return;
        var basename = p.file.replace(/\.[^.]+$/, '');
        var permalink = PROJECT_URL + '?photo=' + basename;
        var photoUrl  = PROJECT_URL + (CONFIG.images.full || 'photos/') + p.file;
        var caption   = p.caption || basename;
        var taken     = p.taken_at || '';
        var bearing   = (typeof p.bearing === 'number') ? p.bearing : null;

        // Description: thumbnail + caption + permalink
        var descParts = [];
        descParts.push('<p><b>' + escapeXml(caption) + '</b></p>');
        descParts.push('<p><img src="' + photoUrl + '" width="320" alt=""/></p>');
        descParts.push('<p><i>Taken ' + escapeXml(taken) + '</i>' +
          (bearing !== null ? ' &middot; bearing ' + Math.round(bearing) + '°' : '') + '</p>');
        descParts.push('<p><a href="' + permalink + '">View on the ' + escapeXml(CONFIG.site.title) + ' map</a></p>');

        lines.push('<Placemark>');
        lines.push('<name>' + escapeXml(basename) + '</name>');
        lines.push('<description><![CDATA[' + safeCdata(descParts.join('')) + ']]></description>');
        lines.push('<styleUrl>#photo</styleUrl>');
        // KML coordinate order is lon,lat,alt
        lines.push('<Point><coordinates>' + p.lon + ',' + p.lat + ',0</coordinates></Point>');
        // Camera bearing as a separate <gx:Camera> would be more sophisticated
        // but most KML viewers ignore <gx:> extensions; bearing is in description.
        if (taken) lines.push('<TimeStamp><when>' + escapeXml(taken) + '</when></TimeStamp>');
        lines.push('</Placemark>');
      });
      lines.push('</Folder>');
    }

    // ── Landmarks folder ─────────────────────────────────
    if (typeof landmarks !== 'undefined' && landmarks.length) {
      lines.push('<Folder><name>Landmarks (' + landmarks.length + ')</name>');
      lines.push('<description>Named points of interest.</description>');
      landmarks.forEach(function (lm) {
        var nameLine = (lm.name_en || '') + (lm.name_ar ? ' / ' + lm.name_ar : '');
        var descBody = '<p>' + (lm.desc || '').replace(/\n/g, '<br>') + '</p>';
        if (lm.status) descBody += '<p><i>Status: ' + escapeXml(lm.status) + '</i></p>';
        lines.push('<Placemark>');
        lines.push('<name>' + escapeXml(nameLine) + '</name>');
        lines.push('<description><![CDATA[' + safeCdata(descBody) + ']]></description>');
        lines.push('<styleUrl>#landmark</styleUrl>');
        lines.push('<Point><coordinates>' + lm.lon + ',' + lm.lat + ',0</coordinates></Point>');
        lines.push('</Placemark>');
      });
      lines.push('</Folder>');
    }

    // ── Depopulated villages folder ──────────────────────
    if (typeof places !== 'undefined' && places.length) {
      lines.push('<Folder><name>Places (' + places.length + ')</name>');
      lines.push('<visibility>0</visibility>');  // collapsed by default
      lines.push('<description>Regional context places.</description>');
      places.forEach(function (pl) {
        var nameLine = (pl.name_en || '') + (pl.name_ar ? ' / ' + pl.name_ar : '');
        var endTxt   = pl.end ? ' (' + pl.end + ')' : '';
        var descBody = '<p><b>' + escapeXml(pl.name_en) + '</b></p>' +
                       '<p><i>' + escapeXml((pl.status || '') + endTxt + ' &middot; ' + (pl.type || '') + ' &middot; ' + (pl.group || '')) + '</i></p>';
        lines.push('<Placemark>');
        lines.push('<name>' + escapeXml(nameLine) + '</name>');
        lines.push('<description><![CDATA[' + safeCdata(descBody) + ']]></description>');
        lines.push('<styleUrl>#place</styleUrl>');
        lines.push('<Point><coordinates>' + pl.lon + ',' + pl.lat + ',0</coordinates></Point>');
        lines.push('</Placemark>');
      });
      lines.push('</Folder>');
    }

    lines.push('</Document>');
    lines.push('</kml>');
    return lines.join('\n');
  }

  function downloadKML() {
    try {
      var kml = generateKML();
      var blob = new Blob([kml], { type: 'application/vnd.google-earth.kml+xml;charset=utf-8' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = (CONFIG.kml.filename || 'map.kml');
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      // Defer revoke so the download has time to start
      setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    } catch (e) {
      console.error('KML export failed:', e);
      alert('Sorry — KML export failed. ' + (e.message || ''));
    }
  }

  // Expose to global scope so an onclick="downloadKML()" works
  window.generateKML = generateKML;
  window.downloadKML = downloadKML;
})();
