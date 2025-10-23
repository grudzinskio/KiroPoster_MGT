import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { campaignService } from '../../services/campaignService';
import { userService } from '../../services/userService';
import { companyService } from '../../services/companyService';
import type { Campaign } from '../../types/campaign';
import type { User } from '../../types/user';
import type { Company } from '../../types/company';

interface SearchResult {
  type: 'campaign' | 'user' | 'company';
  id: number;
  title: string;
  subtitle?: string;
  data: Campaign | User | Company;
}

interface GlobalSearchProps {
  onResultSelect?: (result: SearchResult) => void;
  placeholder?: string;
  className?: string;
}

export const GlobalSearch: React.FC<GlobalSearchProps> = ({
  onResultSelect,
  placeholder = "Search campaigns, users, companies...",
  className = ""
}) => {
  const { user: currentUser } = useAuth();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const isCompanyEmployee = currentUser?.role === 'company_employee';

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const searchTimeout = setTimeout(() => {
      if (query.trim().length >= 2) {
        performSearch(query.trim());
      } else {
        setResults([]);
        setShowResults(false);
      }
    }, 300);

    return () => clearTimeout(searchTimeout);
  }, [query]);

  const performSearch = async (searchQuery: string) => {
    if (!currentUser) return;

    try {
      setLoading(true);
      const searchResults: SearchResult[] = [];

      // Search campaigns (all users can search campaigns they have access to)
      try {
        const campaignResult = await campaignService.getCampaigns({
          search: searchQuery,
          limit: 5
        });
        
        campaignResult.campaigns.forEach(campaign => {
          searchResults.push({
            type: 'campaign',
            id: campaign.id,
            title: campaign.name,
            subtitle: campaign.company?.name || `Status: ${campaign.status}`,
            data: campaign
          });
        });
      } catch (err) {
        console.error('Error searching campaigns:', err);
      }

      // Search users and companies (only company employees)
      if (isCompanyEmployee) {
        try {
          const users = await userService.getUsers({
            search: searchQuery,
            limit: 5
          });
          
          users.forEach(user => {
            searchResults.push({
              type: 'user',
              id: user.id,
              title: `${user.firstName} ${user.lastName}`,
              subtitle: `${user.email} (${user.role})`,
              data: user
            });
          });
        } catch (err) {
          console.error('Error searching users:', err);
        }

        try {
          const companies = await companyService.getCompanies({
            search: searchQuery,
            limit: 5
          });
          
          companies.forEach(company => {
            searchResults.push({
              type: 'company',
              id: company.id,
              title: company.name,
              subtitle: company.contactEmail || 'Company',
              data: company
            });
          });
        } catch (err) {
          console.error('Error searching companies:', err);
        }
      }

      setResults(searchResults);
      setShowResults(true);
    } catch (err) {
      console.error('Search error:', err);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleResultClick = (result: SearchResult) => {
    setQuery('');
    setShowResults(false);
    onResultSelect?.(result);
  };

  const getResultIcon = (type: SearchResult['type']) => {
    switch (type) {
      case 'campaign':
        return '📋';
      case 'user':
        return '👤';
      case 'company':
        return '🏢';
      default:
        return '🔍';
    }
  };

  const getResultTypeLabel = (type: SearchResult['type']) => {
    switch (type) {
      case 'campaign':
        return 'Campaign';
      case 'user':
        return 'User';
      case 'company':
        return 'Company';
      default:
        return '';
    }
  };

  return (
    <div ref={searchRef} className={`relative ${className}`}>
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => query.trim().length >= 2 && setShowResults(true)}
          placeholder={placeholder}
          className="w-full px-4 py-2 pl-10 pr-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        {loading && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
            <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
          </div>
        )}
      </div>

      {/* Search Results */}
      {showResults && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-96 overflow-y-auto">
          {results.length === 0 && !loading && query.trim().length >= 2 && (
            <div className="px-4 py-3 text-gray-500 text-center">
              No results found for "{query}"
            </div>
          )}
          
          {results.map((result, index) => (
            <button
              key={`${result.type}-${result.id}`}
              type="button"
              onClick={() => handleResultClick(result)}
              className="w-full px-4 py-3 text-left hover:bg-gray-50 focus:bg-gray-50 focus:outline-none border-b border-gray-100 last:border-b-0"
            >
              <div className="flex items-center space-x-3">
                <span className="text-lg">{getResultIcon(result.type)}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <span className="font-medium text-gray-900 truncate">
                      {result.title}
                    </span>
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                      {getResultTypeLabel(result.type)}
                    </span>
                  </div>
                  {result.subtitle && (
                    <div className="text-sm text-gray-500 truncate">
                      {result.subtitle}
                    </div>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};