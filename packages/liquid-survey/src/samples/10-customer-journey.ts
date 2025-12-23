import type { GraphSurvey } from '../types';

export const customerJourneySurvey: GraphSurvey = {
  id: 'customer-journey-survey',
  title: 'Customer Journey Survey',
  description: 'Share your complete experience with us - from discovery to satisfaction',
  startNodeId: 'start',
  nodes: {
    // ===== Start Node =====
    start: {
      id: 'start',
      type: 'start',
      content: {
        title: 'Welcome!',
        message: 'Thank you for taking the time to share your journey with us. This should take about 5 minutes.',
      },
      next: [{ nodeId: 'discovery-how-found' }],
    },

    // ===== STAGE 1: Discovery =====
    'discovery-how-found': {
      id: 'discovery-how-found',
      type: 'question',
      content: {
        question: 'How did you first find out about us?',
        description: 'Understanding where our customers discover us helps us improve our outreach',
        type: 'choice',
        required: true,
        options: [
          { id: 'search', label: 'Search Engine', value: 'search' },
          { id: 'social', label: 'Social Media', value: 'social' },
          { id: 'referral', label: 'Friend/Family Referral', value: 'referral' },
          { id: 'ad', label: 'Advertisement', value: 'ad' },
          { id: 'other', label: 'Other', value: 'other' },
        ],
      },
      next: [
        { condition: { operator: 'equals', value: 'search' }, nodeId: 'discovery-search-detail' },
        { condition: { operator: 'equals', value: 'social' }, nodeId: 'discovery-social-detail' },
        { condition: { operator: 'equals', value: 'referral' }, nodeId: 'discovery-referral-detail' },
        { condition: { operator: 'equals', value: 'ad' }, nodeId: 'discovery-ad-detail' },
        { condition: { operator: 'equals', value: 'other' }, nodeId: 'discovery-other-detail' },
      ],
    },

    'discovery-search-detail': {
      id: 'discovery-search-detail',
      type: 'question',
      content: {
        question: 'Which search engine did you use?',
        type: 'choice',
        required: true,
        options: [
          { id: 'google', label: 'Google', value: 'google' },
          { id: 'bing', label: 'Bing', value: 'bing' },
          { id: 'duckduckgo', label: 'DuckDuckGo', value: 'duckduckgo' },
          { id: 'other-search', label: 'Other', value: 'other-search' },
        ],
      },
      next: [{ nodeId: 'experience-purchase' }],
    },

    'discovery-social-detail': {
      id: 'discovery-social-detail',
      type: 'question',
      content: {
        question: 'Which social media platform?',
        type: 'choice',
        required: true,
        options: [
          { id: 'facebook', label: 'Facebook', value: 'facebook' },
          { id: 'instagram', label: 'Instagram', value: 'instagram' },
          { id: 'twitter', label: 'Twitter/X', value: 'twitter' },
          { id: 'linkedin', label: 'LinkedIn', value: 'linkedin' },
          { id: 'tiktok', label: 'TikTok', value: 'tiktok' },
          { id: 'other-social', label: 'Other', value: 'other-social' },
        ],
      },
      next: [{ nodeId: 'experience-purchase' }],
    },

    'discovery-referral-detail': {
      id: 'discovery-referral-detail',
      type: 'question',
      content: {
        question: 'How did you hear about us from them?',
        type: 'choice',
        required: true,
        options: [
          { id: 'in-person', label: 'In-person conversation', value: 'in-person' },
          { id: 'message', label: 'Message/Email', value: 'message' },
          { id: 'social-share', label: 'Social media share', value: 'social-share' },
          { id: 'other-referral', label: 'Other', value: 'other-referral' },
        ],
      },
      next: [{ nodeId: 'experience-purchase' }],
    },

    'discovery-ad-detail': {
      id: 'discovery-ad-detail',
      type: 'question',
      content: {
        question: 'Where did you see the advertisement?',
        type: 'choice',
        required: true,
        options: [
          { id: 'online-ad', label: 'Online (Google, Facebook, etc.)', value: 'online-ad' },
          { id: 'tv', label: 'Television', value: 'tv' },
          { id: 'radio', label: 'Radio', value: 'radio' },
          { id: 'print', label: 'Print (Magazine, Newspaper)', value: 'print' },
          { id: 'billboard', label: 'Billboard/Outdoor', value: 'billboard' },
          { id: 'other-ad', label: 'Other', value: 'other-ad' },
        ],
      },
      next: [{ nodeId: 'experience-purchase' }],
    },

    'discovery-other-detail': {
      id: 'discovery-other-detail',
      type: 'question',
      content: {
        question: 'Please tell us how you discovered us',
        type: 'text',
        required: true,
        placeholder: 'Describe how you found us...',
      },
      next: [{ nodeId: 'experience-purchase' }],
    },

    // ===== STAGE 2: Experience (Convergence Point 1) =====
    'experience-purchase': {
      id: 'experience-purchase',
      type: 'question',
      content: {
        question: 'What did you purchase or interact with?',
        description: 'Select what best describes your experience with us',
        type: 'choice',
        required: true,
        options: [
          { id: 'product-a', label: 'Product A - Premium Widget', value: 'product-a' },
          { id: 'product-b', label: 'Product B - Essential Kit', value: 'product-b' },
          { id: 'service', label: 'Service/Consultation', value: 'service' },
          { id: 'nothing', label: "Just browsing - didn't purchase", value: 'nothing' },
        ],
      },
      next: [
        { condition: { operator: 'equals', value: 'nothing' }, nodeId: 'experience-no-purchase-reason' },
        { condition: { operator: 'in', value: ['product-a', 'product-b', 'service'] }, nodeId: 'satisfaction-matrix' },
      ],
    },

    'experience-no-purchase-reason': {
      id: 'experience-no-purchase-reason',
      type: 'question',
      content: {
        question: 'What prevented you from making a purchase?',
        description: 'Your feedback helps us improve',
        type: 'choice',
        required: true,
        options: [
          { id: 'price', label: 'Price too high', value: 'price' },
          { id: 'not-ready', label: 'Not ready to buy yet', value: 'not-ready' },
          { id: 'no-need', label: "Didn't find what I needed", value: 'no-need' },
          { id: 'trust', label: 'Trust/credibility concerns', value: 'trust' },
          { id: 'competitor', label: 'Found a better option elsewhere', value: 'competitor' },
          { id: 'other-reason', label: 'Other reason', value: 'other-reason' },
        ],
      },
      next: [{ nodeId: 'future-would-purchase' }],
    },

    // ===== STAGE 3: Satisfaction (for purchasers only) =====
    'satisfaction-matrix': {
      id: 'satisfaction-matrix',
      type: 'question',
      content: {
        question: 'Please rate different aspects of your experience',
        description: 'Help us understand what we did well and where we can improve',
        type: 'matrix',
        required: true,
        matrixRows: ['Quality', 'Price', 'Delivery/Service', 'Customer Support'],
        matrixColumns: ['1 - Poor', '2 - Fair', '3 - Good', '4 - Very Good', '5 - Excellent'],
        matrixType: 'radio',
      },
      next: [{ nodeId: 'satisfaction-nps' }],
    },

    'satisfaction-nps': {
      id: 'satisfaction-nps',
      type: 'question',
      content: {
        question: 'How likely are you to recommend us to a friend or colleague?',
        description: '0 = Not at all likely, 10 = Extremely likely',
        type: 'nps',
        required: true,
        min: 0,
        max: 10,
      },
      next: [
        { condition: { operator: 'greaterOrEqual', value: 9 }, nodeId: 'satisfaction-promoter-share' },
        { condition: { operator: 'lessOrEqual', value: 6 }, nodeId: 'satisfaction-detractor-issues' },
        { nodeId: 'future-would-purchase' }, // Default for passive (7-8)
      ],
    },

    'satisfaction-promoter-share': {
      id: 'satisfaction-promoter-share',
      type: 'question',
      content: {
        question: 'Would you like to share your experience on social media?',
        description: 'Your recommendation means the world to us!',
        type: 'imageChoice',
        required: false,
        imageOptions: [
          {
            id: 'facebook-share',
            label: 'Share on Facebook',
            value: 'facebook',
            imageUrl: 'https://cdn.simpleicons.org/facebook/1877F2',
          },
          {
            id: 'twitter-share',
            label: 'Share on Twitter',
            value: 'twitter',
            imageUrl: 'https://cdn.simpleicons.org/x/000000',
          },
          {
            id: 'linkedin-share',
            label: 'Share on LinkedIn',
            value: 'linkedin',
            imageUrl: 'https://cdn.simpleicons.org/linkedin/0A66C2',
          },
          {
            id: 'no-share',
            label: 'Maybe later',
            value: 'no-share',
            imageUrl: 'https://cdn.simpleicons.org/data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0Ij48cGF0aCBmaWxsPSIjOTk5IiBkPSJNMTIgMkM2LjQ4IDIgMiA2LjQ4IDIgMTJzNC40OCAxMCAxMCAxMCAxMC00LjQ4IDEwLTEwUzE3LjUyIDIgMTIgMnoiLz48L3N2Zz4=/gray',
          },
        ],
      },
      next: [{ nodeId: 'future-would-purchase' }],
    },

    'satisfaction-detractor-issues': {
      id: 'satisfaction-detractor-issues',
      type: 'question',
      content: {
        question: 'What were the main issues you experienced?',
        description: 'Select all that apply - we want to make this right',
        type: 'multiSelect',
        required: true,
        searchable: true,
        options: [
          { id: 'quality-issue', label: 'Product/Service quality below expectations', value: 'quality-issue' },
          { id: 'price-high', label: 'Price too high for value received', value: 'price-high' },
          { id: 'delivery-slow', label: 'Slow delivery or service', value: 'delivery-slow' },
          { id: 'delivery-damaged', label: 'Damaged or incorrect delivery', value: 'delivery-damaged' },
          { id: 'support-poor', label: 'Poor customer support', value: 'support-poor' },
          { id: 'support-slow', label: 'Slow support response', value: 'support-slow' },
          { id: 'website-ux', label: 'Website difficult to use', value: 'website-ux' },
          { id: 'not-as-described', label: 'Product not as described', value: 'not-as-described' },
          { id: 'other-issue', label: 'Other issues', value: 'other-issue' },
        ],
      },
      next: [{ nodeId: 'satisfaction-detractor-details' }],
    },

    'satisfaction-detractor-details': {
      id: 'satisfaction-detractor-details',
      type: 'question',
      content: {
        question: 'Please provide more details about your experience',
        description: 'The more specific you are, the better we can address these concerns',
        type: 'text',
        required: true,
        placeholder: 'Tell us what happened...',
        validation: {
          minLength: 20,
          errorMessage: 'Please provide at least 20 characters of detail',
        },
      },
      next: [{ nodeId: 'future-would-purchase' }],
    },

    // ===== STAGE 4: Future (Convergence Point 2 - all paths merge here) =====
    'future-would-purchase': {
      id: 'future-would-purchase',
      type: 'question',
      content: {
        question: 'Would you consider purchasing from us in the future?',
        type: 'yesNo',
        required: true,
      },
      next: [
        { condition: { operator: 'equals', value: 'yes' }, nodeId: 'future-interests' },
        { nodeId: 'future-price-quality' }, // Default for 'no'
      ],
    },

    'future-interests': {
      id: 'future-interests',
      type: 'question',
      content: {
        question: 'What products or services interest you?',
        description: 'Select all that interest you',
        type: 'multiChoice',
        required: false,
        options: [
          { id: 'new-products', label: 'New product launches', value: 'new-products' },
          { id: 'premium-line', label: 'Premium product line', value: 'premium-line' },
          { id: 'budget-line', label: 'Budget-friendly options', value: 'budget-line' },
          { id: 'services', label: 'Professional services', value: 'services' },
          { id: 'subscriptions', label: 'Subscription plans', value: 'subscriptions' },
          { id: 'bundles', label: 'Product bundles', value: 'bundles' },
        ],
      },
      next: [{ nodeId: 'future-price-quality' }],
    },

    'future-price-quality': {
      id: 'future-price-quality',
      type: 'question',
      content: {
        question: 'For you, what matters more when making a purchase?',
        description: 'Slide to indicate your preference',
        type: 'slider',
        required: true,
        sliderMin: 0,
        sliderMax: 100,
        sliderStep: 1,
        sliderShowValue: true,
        placeholder: '0 = Price is everything | 100 = Quality is everything',
      },
      next: [{ nodeId: 'future-email' }],
    },

    'future-email': {
      id: 'future-email',
      type: 'question',
      content: {
        question: 'Stay in touch with exclusive offers and updates?',
        description: 'Optional - we respect your privacy and never spam',
        type: 'email',
        required: false,
        placeholder: 'your.email@example.com',
        emailValidation: 'basic',
      },
      next: [{ nodeId: 'end' }],
    },

    // ===== End Node (with dynamic message based on journey) =====
    end: {
      id: 'end',
      type: 'end',
      content: {
        title: 'Thank You!',
        message: 'Your feedback is invaluable to us. We appreciate you taking the time to share your complete journey. Every response helps us serve our customers better.',
      },
      next: [],
    },
  },
};
