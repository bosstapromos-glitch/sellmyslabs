"""Import a reviewed TCDB public HTML snapshot without adding runtime dependencies.

Usage: python3 scripts/import-tcdb-shows.py input.html YYYY-MM-DD [reviewed-links.json]
Fails closed if any event cannot be parsed. It replaces the TCDB snapshot only;
Lifestyle's shared feed and historical records are still read by the application.
"""

import json
import sys
from datetime import datetime
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import parse_qs, urljoin, urlparse

SOURCE = "https://www.tcdb.com/CardShows.cfm"
US = dict(pair.split(":", 1) for pair in (
    "AL:Alabama|AK:Alaska|AZ:Arizona|AR:Arkansas|CA:California|CO:Colorado|CT:Connecticut|"
    "DE:Delaware|DC:District of Columbia|FL:Florida|GA:Georgia|HI:Hawaii|ID:Idaho|IL:Illinois|"
    "IN:Indiana|IA:Iowa|KS:Kansas|KY:Kentucky|LA:Louisiana|ME:Maine|MD:Maryland|MA:Massachusetts|"
    "MI:Michigan|MN:Minnesota|MS:Mississippi|MO:Missouri|MT:Montana|NE:Nebraska|NV:Nevada|"
    "NH:New Hampshire|NJ:New Jersey|NM:New Mexico|NY:New York|NC:North Carolina|ND:North Dakota|"
    "OH:Ohio|OK:Oklahoma|OR:Oregon|PA:Pennsylvania|RI:Rhode Island|SC:South Carolina|SD:South Dakota|"
    "TN:Tennessee|TX:Texas|UT:Utah|VT:Vermont|VA:Virginia|WA:Washington|WV:West Virginia|WI:Wisconsin|WY:Wyoming"
).split("|"))
CA = dict(pair.split(":", 1) for pair in (
    "AB:Alberta|BC:British Columbia|MB:Manitoba|NB:New Brunswick|NL:Newfoundland and Labrador|"
    "NS:Nova Scotia|NT:Northwest Territories|NU:Nunavut|ON:Ontario|PE:Prince Edward Island|"
    "QC:Quebec|SK:Saskatchewan|YT:Yukon"
).split("|"))
COUNTRIES = {"United States": "US", "Canada": "CA", "Australia": "AU", "Belgium": "BE",
             "France": "FR", "Germany": "DE", "United Kingdom": "GB", "Hong Kong": "HK",
             "Macau": "MO", "Romania": "RO"}


class Events(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.depth = 0
        self.parts = []
        self.href = ""
        self.rows = []
        self.has_time = False

    def handle_starttag(self, tag, attributes):
        attrs = dict(attributes)
        if tag == "div" and "carousel-item" in attrs.get("class", "").split():
            if self.depth:
                raise ValueError("Unexpected nested event")
            self.depth = 1
            self.parts = []
            self.href = ""
            self.has_time = False
        elif self.depth:
            if tag == "div":
                self.depth += 1
            elif tag == "br":
                self.parts.append("\n")
            elif tag == "a":
                self.href = attrs.get("href", "")
            elif tag == "i" and "fa-clock" in attrs.get("class", "").split():
                self.has_time = True

    def handle_data(self, value):
        if self.depth:
            self.parts.append(value)

    def handle_endtag(self, tag):
        if self.depth and tag == "div":
            self.depth -= 1
            if not self.depth:
                lines = [" ".join(line.split()) for line in "".join(self.parts).split("\n")]
                lines = [line for line in lines if line]
                if len(lines) == 4 and not self.has_time:
                    lines.insert(2, "")
                if len(lines) != 5:
                    raise ValueError(f"Expected five event fields, got {lines!r}")
                title, date_label, time, venue, location = lines
                date = datetime.strptime(date_label, "%A, %B %d, %Y").date().isoformat()
                url = urljoin(SOURCE, self.href)
                parsed = urlparse(url)
                params = parse_qs(parsed.query)
                source_id = params.get("ID", [""])[0]
                if parsed.netloc != "www.tcdb.com" or parsed.path != "/CardShows.cfm" or not source_id.isdigit() or params.get("MODE") != ["VIEW"]:
                    raise ValueError(f"Invalid TCDB event link: {url}")
                parts = [part.strip() for part in location.split(",")]
                country = parts[-1] if parts[-1] in COUNTRIES else ""
                city = parts[0]
                state_code = ", ".join(parts[1:-1]) if country else ""
                regions = US if country == "United States" else CA if country == "Canada" else {}
                state = regions.get(state_code, state_code)
                self.rows.append(dict(id=f"{source_id}-{date}", title=title, url=url, date=date,
                                      time=time, venue=venue, location=location, city=city, state=state,
                                      stateCode=state_code, country=country, countryCode=COUNTRIES.get(country, "")))


def parse_snapshot(html, imported_on):
    datetime.strptime(imported_on, "%Y-%m-%d")
    parser = Events()
    parser.feed(html)
    parser.close()
    if parser.depth or not parser.rows:
        raise ValueError("Incomplete or empty event snapshot")
    ids = [row["id"] for row in parser.rows]
    if len(ids) != len(set(ids)):
        raise ValueError("Duplicate dated TCDB events")
    rows = sorted(parser.rows, key=lambda row: (row["date"], row["title"], row["id"]))
    return dict(source=SOURCE, fetchedAt=imported_on, coverageFrom=rows[0]["date"],
                coverageThrough=rows[-1]["date"], shows=rows)


if __name__ == "__main__":
    snapshot = parse_snapshot(Path(sys.argv[1]).read_text(), sys.argv[2])
    path = Path(__file__).resolve().parent.parent / "data" / "tcdb-shows.json"
    previous = {row["id"]: row for row in json.loads(path.read_text())["shows"]} if path.exists() else {}
    links = {row["id"]: row for row in json.loads(Path(sys.argv[3]).read_text())} if len(sys.argv) > 3 else {}
    for row in snapshot["shows"]:
        old = previous.get(row["id"], {})
        if all(old.get(key) == row[key] for key in ("title", "venue", "location")) and old.get("website"):
            row["website"] = old["website"]
        review = links.get(row["id"], {})
        if review.get("links"):
            if not review.get("title", "").startswith(row["title"] + " - "):
                raise ValueError("Direct-link review belongs to a different event: " + row["id"])
            website = review["links"][0]
            parsed = urlparse(website)
            if parsed.scheme not in ("http", "https") or not parsed.hostname or parsed.username or parsed.password or parsed.hostname == "tcdb.com" or parsed.hostname.endswith(".tcdb.com"):
                raise ValueError("Invalid direct event website: " + row["id"])
            row["website"] = website
    path.parent.mkdir(exist_ok=True)
    path.write_text(json.dumps(snapshot, ensure_ascii=False, indent=2) + "\n")
    print(json.dumps({key: value for key, value in snapshot.items() if key != "shows"} | {"count": len(snapshot["shows"])}))
