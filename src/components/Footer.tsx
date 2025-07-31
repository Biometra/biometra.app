import React from 'react';
import { ExternalLink, FileText, MessageCircle, Twitter } from 'lucide-react';

function Footer() {
  return (
    <footer className="py-12 px-4 bg-black/40 border-t border-purple-500/20">
      <div className="container mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div>
            <div className="flex items-center space-x-2 mb-4">
              <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-cyan-500 rounded-lg"></div>
              <span className="text-xl font-bold text-white">Biometra</span>
            </div>
            <p className="text-gray-300 text-sm mb-4">
              The future of digital identity through biometric mining and blockchain technology.
            </p>
            <div className="text-xs text-gray-400">
              © 2025 Biometra. All rights reserved.
            </div>
          </div>

          {/* Resources */}
          <div>
            <h3 className="text-white font-semibold mb-4">Resources</h3>
            <div className="space-y-2">
              <a
                href="#"
                className="flex items-center space-x-2 text-gray-300 hover:text-white transition-colors text-sm"
              >
                <FileText className="w-4 h-4" />
                <span>Whitepaper</span>
                <ExternalLink className="w-3 h-3" />
              </a>
              <a
                href="#"
                className="flex items-center space-x-2 text-gray-300 hover:text-white transition-colors text-sm"
              >
                <FileText className="w-4 h-4" />
                <span>Tokenomics</span>
              </a>
              <a
                href="#"
                className="flex items-center space-x-2 text-gray-300 hover:text-white transition-colors text-sm"
              >
                <FileText className="w-4 h-4" />
                <span>Roadmap</span>
              </a>
            </div>
          </div>

          {/* Community */}
          <div>
            <h3 className="text-white font-semibold mb-4">Community</h3>
            <div className="space-y-2">
              <a
                href="#"
                className="flex items-center space-x-2 text-gray-300 hover:text-white transition-colors text-sm"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Telegram</span>
                <ExternalLink className="w-3 h-3" />
              </a>
              <a
                href="#"
                className="flex items-center space-x-2 text-gray-300 hover:text-white transition-colors text-sm"
              >
                <Twitter className="w-4 h-4" />
                <span>Twitter</span>
                <ExternalLink className="w-3 h-3" />
              </a>
              <a
                href="#"
                className="flex items-center space-x-2 text-gray-300 hover:text-white transition-colors text-sm"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Discord</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>

          {/* Legal */}
          <div>
            <h3 className="text-white font-semibold mb-4">Legal</h3>
            <div className="space-y-2">
              <a href="#" className="block text-gray-300 hover:text-white transition-colors text-sm">
                Terms of Service
              </a>
              <a href="#" className="block text-gray-300 hover:text-white transition-colors text-sm">
                Privacy Policy
              </a>
              <a href="#" className="block text-gray-300 hover:text-white transition-colors text-sm">
                Risk Disclaimer
              </a>
            </div>
          </div>
        </div>

        <div className="border-t border-purple-500/20 mt-8 pt-8">
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
            <div className="text-yellow-400 text-sm font-semibold mb-2">⚠️ Important Disclaimer</div>
            <div className="text-yellow-300 text-xs">
              Biometra is an experimental platform. Cryptocurrency investments carry high risk. 
              $BIO tokens have no guaranteed value. Always do your own research (DYOR) before participating. 
              This is not financial advice.
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;