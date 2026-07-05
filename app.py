import time
import urllib.request
import xml.etree.ElementTree as ET
import re
from flask import Flask, jsonify, request, render_template

app = Flask(__name__, template_folder='templates', static_folder='static')

FEED_URL = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"
CACHE_DURATION = 300  # Cache for 5 minutes (300 seconds)

# Simple in-memory cache
feed_cache = {
    'data': None,
    'last_fetched': 0
}

def strip_html_tags(html_text):
    """Strip HTML tags for clean text previews (e.g., for Twitter)."""
    if not html_text:
        return ""
    # Replace common HTML block elements/breaks with spaces/newlines
    text = html_text.replace("<p>", "").replace("</p>", "\n\n")
    text = text.replace("<br>", "\n").replace("<br/>", "\n").replace("<br />", "\n")
    # Strip any remaining HTML tags
    clean = re.compile('<.*?>')
    cleaned_text = re.sub(clean, '', text)
    # Decode HTML entities if any (like &amp;, &lt;, &gt;)
    import html
    cleaned_text = html.unescape(cleaned_text)
    # Remove multiple spaces/newlines
    cleaned_text = re.sub(r' +', ' ', cleaned_text)
    cleaned_text = re.sub(r'\n{3,}', '\n\n', cleaned_text)
    return cleaned_text.strip()

def parse_entry_html(html_content):
    """
    Parses the HTML description of a release note entry.
    An entry description contains one or more <h3> tags representing the release type
    (e.g., Feature, Change, Fix, Deprecation) followed by paragraph elements.
    """
    if not html_content:
        return []
    
    # Check if there are any h3 tags
    if not re.search(r'<h3>.*?</h3>', html_content, flags=re.DOTALL):
        # No headings, treat as a single general update
        plain_text = strip_html_tags(html_content)
        return [{
            'type': 'Announcement',
            'html': html_content.strip(),
            'text': plain_text
        }]
    
    # Split by h3 tags to isolate each section
    parts = re.split(r'(<h3>.*?</h3>)', html_content, flags=re.DOTALL)
    items = []
    
    # The first element is any text before the first h3 (usually empty or spacing)
    first_content = parts[0].strip()
    if first_content:
        plain_text = strip_html_tags(first_content)
        items.append({
            'type': 'Announcement',
            'html': first_content,
            'text': plain_text
        })
        
    for i in range(1, len(parts), 2):
        h3_tag = parts[i]
        content = parts[i+1] if i+1 < len(parts) else ""
        
        # Extract content between <h3> and </h3>
        type_match = re.search(r'<h3>(.*?)</h3>', h3_tag, flags=re.DOTALL)
        item_type = type_match.group(1).strip() if type_match else "Update"
        
        plain_text = strip_html_tags(content)
        
        items.append({
            'type': item_type,
            'html': content.strip(),
            'text': plain_text
        })
        
    return items

def fetch_and_parse_feed():
    """Fetches the XML feed from Google Cloud and parses it."""
    headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}
    req = urllib.request.Request(FEED_URL, headers=headers)
    
    with urllib.request.urlopen(req, timeout=15) as response:
        xml_data = response.read()
        
    root = ET.fromstring(xml_data)
    ns = {'atom': 'http://www.w3.org/2005/Atom'}
    
    # Feed metadata
    feed_title = root.find('atom:title', ns)
    feed_title_text = feed_title.text.strip() if feed_title is not None else "BigQuery Release Notes"
    feed_updated = root.find('atom:updated', ns)
    feed_updated_text = feed_updated.text.strip() if feed_updated is not None else ""
    
    entries = root.findall('atom:entry', ns)
    parsed_entries = []
    
    for entry in entries:
        title_elem = entry.find('atom:title', ns)
        id_elem = entry.find('atom:id', ns)
        updated_elem = entry.find('atom:updated', ns)
        link_elem = entry.find('atom:link[@rel="alternate"]', ns)
        if link_elem is None:
            link_elem = entry.find('atom:link', ns)
        content_elem = entry.find('atom:content', ns)
        
        title = title_elem.text.strip() if title_elem is not None else ""
        entry_id = id_elem.text.strip() if id_elem is not None else ""
        updated = updated_elem.text.strip() if updated_elem is not None else ""
        link = link_elem.attrib.get('href', '') if link_elem is not None else ""
        content_html = content_elem.text if content_elem is not None else ""
        
        items = parse_entry_html(content_html)
        
        parsed_entries.append({
            'title': title,
            'id': entry_id,
            'updated': updated,
            'link': link,
            'items': items
        })
        
    return {
        'title': feed_title_text,
        'updated': feed_updated_text,
        'entries': parsed_entries,
        'fetched_at': time.time()
    }

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/releases')
def get_releases():
    force_refresh = request.args.get('refresh', 'false').lower() == 'true'
    current_time = time.time()
    
    # Serve from cache if available and not expired/forced
    if not force_refresh and feed_cache['data'] and (current_time - feed_cache['last_fetched'] < CACHE_DURATION):
        return jsonify({
            'success': True,
            'source': 'cache',
            'data': feed_cache['data']
        })
        
    try:
        data = fetch_and_parse_feed()
        feed_cache['data'] = data
        feed_cache['last_fetched'] = current_time
        return jsonify({
            'success': True,
            'source': 'network',
            'data': data
        })
    except Exception as e:
        # If network fetch fails but we have stale cache, serve it with a warning
        if feed_cache['data']:
            return jsonify({
                'success': True,
                'source': 'stale-cache',
                'warning': f"Failed to refresh feed: {str(e)}. Displaying cached data.",
                'data': feed_cache['data']
            })
        return jsonify({
            'success': False,
            'error': f"Failed to fetch BigQuery release notes: {str(e)}"
        }), 500

if __name__ == '__main__':
    app.run(debug=True, host='127.0.0.1', port=5000)
