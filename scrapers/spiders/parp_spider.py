import scrapy
import json
from datetime import datetime
from typing import Generator
from scrapy.http import Response
from grantflow.items import GrantItem
from grantflow.utils.date_parser import parse_polish_date
from grantflow.utils.amount_parser import parse_amount_range

class PARPSpider(scrapy.Spider):
    """
    Spider for PARP (Polska Agencja Rozwoju Przedsiębiorczości)
    Scrapes: https://www.parp.gov.pl/oferty
    """
    name = 'parp'
    allowed_domains = ['parp.gov.pl']
    start_urls = ['https://www.parp.gov.pl/oferty']
    
    custom_settings = {
        'CONCURRENT_REQUESTS': 2,
        'DOWNLOAD_DELAY': 2,
        'USER_AGENT': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'ROBOTSTXT_OBEY': True,
        'FEEDS': {
            'output/parp_%(time)s.json': {
                'format': 'json',
                'encoding': 'utf8',
                'store_empty': False,
            }
        }
    }

    def parse(self, response: Response) -> Generator[GrantItem, None, None]:
        """Parse main listing page"""
        self.logger.info(f"Parsing PARP offers from {response.url}")
        
        offers = response.css('div.offer-item, article.offer, .program-item')
        
        if not offers:
            self.logger.warning("No offers found. Checking alternative selectors...")
            # Try alternative selectors
            offers = response.css('.view-content .views-row, .node-offer')
        
        self.logger.info(f"Found {len(offers)} offers")
        
        for offer in offers:
            try:
                item = self.parse_offer(offer, response)
                if item:
                    yield item
            except Exception as e:
                self.logger.error(f"Error parsing offer: {e}")
                continue
        
        # Follow pagination
        next_page = response.css('a.next::attr(href), li.pager-next a::attr(href)').get()
        if next_page:
            yield response.follow(next_page, self.parse)

    def parse_offer(self, selector, response) -> GrantItem | None:
        """Parse single offer"""
        item = GrantItem()
        
        # Basic info
        item['title'] = self.extract_text(selector, 'h2, .title, .offer-title')
        if not item['title']:
            return None
            
        item['short_description'] = self.extract_text(selector, '.summary, .description, .teaser')
        
        # Source info
        item['source_type'] = 'NATIONAL'
        item['source_name'] = 'PARP'
        item['source_url'] = response.urljoin(
            selector.css('a::attr(href)').get('')
        )
        
        # Amount
        amount_text = self.extract_text(selector, '.budget, .amount, .fundusz')
        if amount_text:
            min_amt, max_amt = parse_amount_range(amount_text)
            item['amount_min'] = min_amt
            item['amount_max'] = max_amt
        else:
            item['amount_min'] = 0
            item['amount_max'] = 0
        
        # Deadline
        deadline_text = self.extract_text(selector, '.deadline, .termin, .data-konca')
        if deadline_text:
            item['deadline'] = parse_polish_date(deadline_text)
        else:
            item['deadline'] = None
        
        # Category detection from title/description
        item['category'] = self.detect_category(
            f"{item['title']} {item.get('short_description', '')}"
        )
        
        # Target group
        item['target_group'] = self.detect_target_group(
            f"{item['title']} {item.get('short_description', '')}"
        )
        
        # Region - PARP is national
        item['region'] = 'Cała Polska'
        item['voivodeship'] = None
        
        # Status
        item['status'] = self.detect_status(selector, deadline_text)
        
        # Difficulty estimate (1-5)
        item['difficulty'] = self.estimate_difficulty(item)
        
        # External ID from URL
        item['external_id'] = self.extract_external_id(item['source_url'])
        
        return item

    def extract_text(self, selector, css_selectors: str) -> str:
        """Extract text using multiple possible selectors"""
        for sel in css_selectors.split(','):
            text = selector.css(f'{sel.strip()}::text').get('').strip()
            if text:
                return text
        return ''

    def detect_category(self, text: str) -> str:
        """Detect business category from text"""
        text = text.lower()
        categories = {
            'it': ['informatyk', 'software', 'cyfryzacja', 'ai', 'blockchain', 'it ', 'technologie'],
            'innowacje': ['innowacj', 'badania', 'rozwoj', 'r&d', 'patent'],
            'ekspansja': ['eksport', 'zagranic', 'rynek zagraniczny'],
            'eko': ['eko', 'zielona', 'odnawialne', 'środowisko', 'klimat'],
            'przemysl': ['przemysł', 'produkcja', 'manufactur'],
            'rolnictwo': ['roln', 'agro', 'żywność'],
            'turystyka': ['turyst', 'hotel', 'hotelow'],
            'handel': ['handel', 'sklep', 'retail'],
        }
        
        for cat, keywords in categories.items():
            if any(kw in text for kw in keywords):
                return cat.capitalize()
        
        return 'Inne'

    def detect_target_group(self, text: str) -> list:
        """Detect target company types"""
        text = text.lower()
        groups = []
        
        if any(x in text for x in ['mikro', 'jdg', 'jednoosobowa', 'startup']):
            groups.append('JDG')
        if any(x in text for x in ['msp', 'mśp', 'sme', 'mała i średnia']):
            groups.append('MŚP')
        if any(x in text for x in ['sp. z o.o.', 'spółka z o.o', 'spzoo']):
            groups.append('Sp. z o.o.')
        if any(x in text for x in ['duże przedsiębiorstw', 'korporacj']):
            groups.append('Duże przedsiębiorstwo')
        if not groups:
            groups = ['MŚP']  # Default for PARP
            
        return groups

    def detect_status(self, selector, deadline_text: str) -> str:
        """Detect grant status"""
        # Check for explicit status labels
        status_label = selector.css('.status, .stan, .label').get('').lower()
        
        if 'zakończ' in status_label or 'zamknięt' in status_label:
            return 'CLOSED'
        if 'wkrótce' in status_label or 'nabór od' in status_label:
            return 'UPCOMING'
        
        # Check deadline
        if deadline_text:
            try:
                deadline = parse_polish_date(deadline_text)
                if deadline and deadline < datetime.now():
                    return 'CLOSED'
            except:
                pass
        
        return 'ACTIVE'

    def estimate_difficulty(self, item: GrantItem) -> int:
        """Estimate application difficulty (1-5)"""
        score = 3  # Default medium
        
        text = f"{item.get('title', '')} {item.get('short_description', '')}".lower()
        
        # Hard indicators
        hard_words = ['konkurs', ' Rankingowy', 'bardzo wysoka', 'złożony', 'duży projekt']
        if any(w in text for w in hard_words):
            score += 1
        if item.get('amount_max', 0) > 5_000_000:  # >5M PLN
            score += 1
            
        # Easy indicators
        easy_words = ['dotacja', 'bezzwrotna', 'szybka ścieżka', 'uproszczony']
        if any(w in text for w in easy_words):
            score -= 1
        if item.get('amount_max', 0) < 500_000:  # <500k PLN
            score -= 1
            
        return max(1, min(5, score))

    def extract_external_id(self, url: str) -> str | None:
        """Extract external ID from URL"""
        import re
        # PARP URLs often contain node/123 or offer/123
        match = re.search(r'(?:node|offer|program)/(\d+)', url)
        return match.group(1) if match else None

    def closed(self, reason):
        """Called when spider is closed"""
        self.logger.info(f'Spider closed: {reason}')
        # Here you could trigger notifications about new/changed grants