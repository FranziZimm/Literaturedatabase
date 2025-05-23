{
	"translatorID": "f8b5501a-1acc-4ffa-a0a5-594add5e6bd3",
	"translatorType": 4,
	"label": "US National Archives Research Catalog",
	"creator": "Philipp Zumstein",
	"target": "^https?://catalog\\.archives\\.gov/",
	"minVersion": "3.0",
	"maxVersion": null,
	"priority": 100,
	"inRepository": true,
	"browserSupport": "gcsibv",
	"lastUpdated": "2024-08-21 17:50:00"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2017 Philipp Zumstein
	
	This file is part of Zotero.

	Zotero is free software: you can redistribute it and/or modify
	it under the terms of the GNU Affero General Public License as published by
	the Free Software Foundation, either version 3 of the License, or
	(at your option) any later version.

	Zotero is distributed in the hope that it will be useful,
	but WITHOUT ANY WARRANTY; without even the implied warranty of
	MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
	GNU Affero General Public License for more details.

	You should have received a copy of the GNU Affero General Public License
	along with Zotero. If not, see <http://www.gnu.org/licenses/>.

	***** END LICENSE BLOCK *****
*/


function detectWeb(doc, url) {
	if (url.includes('/id/')) {
		return "book";
		// something like archival material would be more appropriate...
		// but for now we use this type to save some information
	}
	// multiples will not work easily because the API will then return
	// somehow an empty json, thus we skipped this here.
	return false;
}


async function doWeb(doc, url) {
	let position = url.indexOf('/id/');
	let id = url.substr(position + 4);
	let jsonURL = `https://catalog.archives.gov/proxy/records/search?naId_is=${id}&allowLegacyOrgNames=true`;
	let json = (await requestJSON(jsonURL)).body.hits.hits[0]._source.record;

	let item = new Zotero.Item("book");
	item.title = json.title;
	var creators = [];
	if (json.creators) {
		creators.push(...json.creators);
	}
	if (json.ancestors) {
		for (let ancestor of json.ancestors) {
			if (ancestor.creators) {
				creators.push(...ancestor.creators);
			}
		}
	}
	for (var i = 0; i < creators.length; i++) {
		creators[i] = creators[i].heading.replace('(Most Recent)', '');
		// TODO: Update and simplify this. We should be able to clean authors like:
		//   Veterans Administration. (7/21/1930 - 3/15/1989)
		// and probably don't need two branches for the cleaning.
		if (creators[i].includes(", ")) {
			creators[i] = creators[i].replace(/, \d{4}\s*-\s*(\d{4})?$/, '').replace(/\([^(]+\)/, '');
			item.creators.push(ZU.cleanAuthor(creators[i], "author", true));
		}
		else {
			creators[i] = creators[i].replace(/\.? ?\d\d?\/\d\d?\/\d\d\d\d-\d\d?\/\d\d?\/\d\d\d\d/, '');
			if (creators[i].length > 255) {
				creators[i] = creators[i].substr(0, 251) + '...';
			}
			item.creators.push({ lastName: creators[i].trim(), creatorType: 'author', fieldMode: 1 });
		}
	}

	if (doc.querySelector('#preview.digital-objects')) {
		item.url = url;
	}
	else {
		item.attachments.push({
			title: 'Catalog Page',
			url,
			mimeType: 'text/html'
		});
	}

	let resourcesHeading = doc.querySelector('h2#resources');
	if (resourcesHeading) {
		for (let resource of resourcesHeading.parentElement.querySelectorAll('a[role="link"]')) {
			let href = resource.title.match(/Go to (https:\/\/[^\s]+)/);
			if (!href) continue;
			item.attachments.push({
				title: resource.textContent,
				url: href[1],
				mimeType: 'text/html',
				snapshot: false
			});
		}
	}

	if (json.coverageStartDate) {
		item.date = json.coverageStartDate.logicalDate.replace('-01-01', '');
		// Use issued if we have a date range
		if (json.coverageEndDate) {
			item.extra = 'issued: ' + item.date + '/'
				+ json.coverageEndDate.logicalDate.replace('-12-31', '');
		}
	}
	else {
		item.date = json.date;
	}
	if (json.ancestors.length) {
		item.series = json.ancestors[0].title;
	}
	item.abstractNote = json.scopeAndContentNote;
	if (json.physicalOccurrences) {
		for (let p of json.physicalOccurrences) {
			if (p.referenceUnits.length && p.referenceUnits[0].name) {
				item.archive = p.referenceUnits[0].name.replace(/\[.*\]/, '');
				break;
			}
		}
	}
	item.archiveLocation = json.localIdentifier;
	item.extra = (item.extra || '') + '\nNational Archives Identifier: ' + json.naId;
	item.complete();
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://catalog.archives.gov/id/486076",
		"items": [
			{
				"itemType": "book",
				"title": "The Struggle for Trade Union Democracy, December 1947",
				"creators": [
					{
						"lastName": "Supreme Commander for the Allied Powers. Economic and Scientific Section. Director for Labor. Labor Division",
						"creatorType": "author",
						"fieldMode": 1
					}
				],
				"date": "1945",
				"archive": "National Archives at College Park - Textual Reference",
				"extra": "issued: 1945/1952\nNational Archives Identifier: 486076",
				"libraryCatalog": "US National Archives Research Catalog",
				"series": "Records of Allied Operational and Occupation Headquarters, World War II",
				"attachments": [
					{
						"title": "Catalog Page",
						"mimeType": "text/html"
					}
				],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://catalog.archives.gov/id/5496901",
		"items": [
			{
				"itemType": "book",
				"title": "Alien Case File for Francisca Torre Vda De Garcia",
				"creators": [
					{
						"lastName": "Department of Justice. Immigration and Naturalization Service",
						"creatorType": "author",
						"fieldMode": 1
					}
				],
				"abstractNote": "This file consists of an alien case file for Francisca Torre Vda De Garcia.  Date of birth is listed as 10/10/1901.  Country is listed as Cuba.  Port of Entry is Miami, Florida.  Date of entry is 03/08/1973.  Father is listed as Zotero.  Mother is listed as Candita.  Alias name is listed as Francisca Torres.",
				"archive": "National Archives at Kansas City",
				"archiveLocation": "A20229735/085-08-0653/Box 186",
				"extra": "National Archives Identifier: 5496901",
				"libraryCatalog": "US National Archives Research Catalog",
				"series": "Records of U.S. Citizenship and Immigration Services",
				"attachments": [
					{
						"title": "Catalog Page",
						"mimeType": "text/html"
					}
				],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://catalog.archives.gov/id/603604",
		"items": [
			{
				"itemType": "book",
				"title": "Manuscripts and Notes",
				"creators": [
					{
						"firstName": "Harriet C.",
						"lastName": "Brown",
						"creatorType": "author"
					}
				],
				"abstractNote": "This series contains book drafts and correspondence.",
				"archive": "Herbert Hoover Library",
				"extra": "National Archives Identifier: 603604",
				"libraryCatalog": "US National Archives Research Catalog",
				"series": "Harriet Connor Brown Papers",
				"attachments": [
					{
						"title": "Catalog Page",
						"mimeType": "text/html"
					}
				],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://catalog.archives.gov/id/115728212",
		"defer": true,
		"items": [
			{
				"itemType": "book",
				"title": "Approved Pension Application File for Lucy Test, Mother of Joseph R Test, Company C, 11th Ohio Infantry Regiment (Application No. WC46539)",
				"creators": [
					{
						"lastName": "Veterans Administration. (7/21/1930 - 3/15/1989)",
						"creatorType": "author",
						"fieldMode": 1
					},
					{
						"lastName": "Department of the Interior. Bureau of Pensions. 1849-1930",
						"creatorType": "author",
						"fieldMode": 1
					}
				],
				"archive": "National Archives at Washington, DC - Textual Reference",
				"extra": "National Archives Identifier: 115728212",
				"libraryCatalog": "US National Archives Research Catalog",
				"series": "Records of the Department of Veterans Affairs",
				"url": "https://catalog.archives.gov/id/115728212",
				"attachments": [
					{
						"title": "Fold3",
						"mimeType": "text/html",
						"snapshot": false
					}
				],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
