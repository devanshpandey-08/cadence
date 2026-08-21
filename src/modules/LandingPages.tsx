import React, { useState, useEffect } from 'react';
import { 
  LayoutTemplate, Type, Image as ImageIcon, Video, Monitor, Smartphone, 
  Tablet, Palette, Settings, Eye, Save, Play, Plus, Trash2, Move, 
  Layers, Grid3X3, Columns, Type as TypeIcon, Image, MousePointer, 
  FormInput, Calendar, CheckSquare, Star, Mail, Phone, MapPin, Globe,
  Download, Upload, Copy, Undo, Redo, ZoomIn, ZoomOut, Maximize,
  Code, FileJson, FileText, Link as LinkIcon, ExternalLink, Anchor,
  BarChart3, TrendingUp, Users, DollarSign, Clock, Zap, Sparkles
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Slider } from '../components/ui/slider';
import { Switch } from '../components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '../components/ui/dialog';
import { Badge } from '../components/ui/badge';
import { ScrollArea } from '../components/ui/scroll-area';
import { ResizableHandle, ResizablePanelGroup, ResizablePanel } from '../components/ui/resizable';
import { useToast } from '../components/ui/use-toast';
import { ToastAction } from '../components/ui/toast';

// Element types for the page builder
type ElementType = 
  | 'header' | 'hero' | 'text' | 'image' | 'video' | 'button' 
  | 'form' | 'testimonial' | 'pricing' | 'faq' | 'footer' 
  | 'navbar' | 'feature-grid' | 'stats' | 'cta' | 'gallery'
  | 'map' | 'social-proof' | 'countdown' | 'embed';

interface PageElement {
  id: string;
  type: ElementType;
  name: string;
  content: any;
  styles: Record<string, any>;
  children?: PageElement[];
}

interface PageTemplate {
  id: string;
  name: string;
  category: string;
  thumbnail: string;
  elements: PageElement[];
  industry?: string;
  conversionRate?: number;
}

const LandingPageBuilder: React.FC = () => {
  const { toast } = useToast();
  const [currentPage, setCurrentPage] = useState<PageElement[]>([]);
  const [selectedElement, setSelectedElement] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'elements' | 'templates' | 'layers'>('elements');
  const [previewMode, setPreviewMode] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [zoomLevel, setZoomLevel] = useState(100);
  const [pageSettings, setPageSettings] = useState({
    title: 'Untitled Landing Page',
    slug: 'untitled-page',
    metaDescription: '',
    metaTitle: '',
    favicon: '',
    customCode: '',
    trackingScripts: [],
    seoScore: 0,
  });
  const [history, setHistory] = useState<PageElement[][]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [showSettings, setShowSettings] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // Pre-built templates
  const templates: PageTemplate[] = [
    {
      id: 'lead-magnet',
      name: 'Lead Magnet Opt-in',
      category: 'Conversion',
      thumbnail: '/templates/lead-magnet.png',
      industry: 'SaaS',
      conversionRate: 24.5,
      elements: []
    },
    {
      id: 'webinar',
      name: 'Webinar Registration',
      category: 'Events',
      thumbnail: '/templates/webinar.png',
      industry: 'Education',
      conversionRate: 18.3,
      elements: []
    },
    {
      id: 'product-launch',
      name: 'Product Launch',
      category: 'Product',
      thumbnail: '/templates/product.png',
      industry: 'E-commerce',
      conversionRate: 12.7,
      elements: []
    },
    {
      id: 'demo-request',
      name: 'Demo Request',
      category: 'B2B',
      thumbnail: '/templates/demo.png',
      industry: 'Enterprise',
      conversionRate: 8.9,
      elements: []
    },
    {
      id: 'ebook-download',
      name: 'eBook Download',
      category: 'Content',
      thumbnail: '/templates/ebook.png',
      industry: 'Marketing',
      conversionRate: 21.2,
      elements: []
    },
    {
      id: 'consultation',
      name: 'Free Consultation',
      category: 'Service',
      thumbnail: '/templates/consultation.png',
      industry: 'Professional Services',
      conversionRate: 15.6,
      elements: []
    }
  ];

  // Available elements
  const elementLibrary = [
    {
      category: 'Structure',
      elements: [
        { type: 'navbar', name: 'Navigation Bar', icon: <Globe size={18} /> },
        { type: 'header', name: 'Page Header', icon: <LayoutTemplate size={18} /> },
        { type: 'hero', name: 'Hero Section', icon: <Monitor size={18} /> },
        { type: 'footer', name: 'Footer', icon: <Columns size={18} /> },
      ]
    },
    {
      category: 'Content',
      elements: [
        { type: 'text', name: 'Text Block', icon: <Type size={18} /> },
        { type: 'image', name: 'Image', icon: <ImageIcon size={18} /> },
        { type: 'video', name: 'Video', icon: <Video size={18} /> },
        { type: 'gallery', name: 'Image Gallery', icon: <Grid3X3 size={18} /> },
      ]
    },
    {
      category: 'Conversion',
      elements: [
        { type: 'form', name: 'Form', icon: <FormInput size={18} /> },
        { type: 'button', name: 'Button', icon: <MousePointer size={18} /> },
        { type: 'cta', name: 'Call-to-Action', icon: <Zap size={18} /> },
        { type: 'countdown', name: 'Countdown Timer', icon: <Clock size={18} /> },
      ]
    },
    {
      category: 'Social Proof',
      elements: [
        { type: 'testimonial', name: 'Testimonial', icon: <Star size={18} /> },
        { type: 'social-proof', name: 'Social Proof', icon: <Users size={18} /> },
        { type: 'stats', name: 'Statistics', icon: <BarChart3 size={18} /> },
      ]
    },
    {
      category: 'Product',
      elements: [
        { type: 'pricing', name: 'Pricing Table', icon: <DollarSign size={18} /> },
        { type: 'feature-grid', name: 'Features Grid', icon: <Layers size={18} /> },
        { type: 'faq', name: 'FAQ Section', icon: <CheckSquare size={18} /> },
      ]
    },
    {
      category: 'Advanced',
      elements: [
        { type: 'map', name: 'Map', icon: <MapPin size={18} /> },
        { type: 'embed', name: 'Embed Code', icon: <Code size={18} /> },
        { type: 'calendar', name: 'Calendar', icon: <Calendar size={18} /> },
      ]
    }
  ];

  const addElement = (type: ElementType) => {
    const newElement: PageElement = {
      id: `element-${Date.now()}`,
      type,
      name: `${type.charAt(0).toUpperCase() + type.slice(1)}`,
      content: getDefaultContent(type),
      styles: getDefaultStyles(type),
    };
    
    const newPage = [...currentPage, newElement];
    setCurrentPage(newPage);
    saveToHistory(newPage);
    setSelectedElement(newElement.id);
    
    toast({
      title: "Element Added",
      description: `${newElement.name} added to your page`,
    });
  };

  const getDefaultContent = (type: ElementType) => {
    switch (type) {
      case 'hero':
        return {
          headline: 'Transform Your Marketing Today',
          subheadline: 'The all-in-one platform that helps you grow faster',
          ctaText: 'Get Started Free',
          ctaLink: '#',
          backgroundImage: '',
          showVideo: false,
          videoUrl: ''
        };
      case 'form':
        return {
          title: 'Get Your Free Guide',
          description: 'Enter your details below to receive instant access',
          fields: [
            { id: 'email', type: 'email', label: 'Email Address', required: true },
            { id: 'name', type: 'text', label: 'Full Name', required: true },
            { id: 'company', type: 'text', label: 'Company', required: false }
          ],
          submitText: 'Download Now',
          successMessage: 'Thank you! Check your email for the guide.',
          webhookUrl: ''
        };
      case 'pricing':
        return {
          title: 'Simple, Transparent Pricing',
          plans: [
            { name: 'Starter', price: 0, period: 'forever', features: ['Up to 1,000 contacts', 'Basic analytics', 'Email support'], highlighted: false },
            { name: 'Professional', price: 49, period: 'month', features: ['Up to 10,000 contacts', 'Advanced analytics', 'Priority support', 'A/B testing'], highlighted: true },
            { name: 'Enterprise', price: 199, period: 'month', features: ['Unlimited contacts', 'Custom reporting', 'Dedicated manager', 'SLA guarantee'], highlighted: false }
          ]
        };
      case 'testimonial':
        return {
          quote: 'Cadence transformed how we do marketing. Our conversion rates doubled in just 3 months!',
          author: 'Sarah Johnson',
          role: 'CMO at TechCorp',
          avatar: '',
          rating: 5,
          companyLogo: ''
        };
      case 'faq':
        return {
          title: 'Frequently Asked Questions',
          questions: [
            { q: 'How does the free trial work?', a: 'You get full access to all features for 14 days. No credit card required.' },
            { q: 'Can I cancel anytime?', a: 'Yes, you can cancel your subscription at any time with no penalties.' },
            { q: 'Do you offer discounts for nonprofits?', a: 'Yes! We offer 50% off for registered nonprofit organizations.' }
          ]
        };
      default:
        return {};
    }
  };

  const getDefaultStyles = (type: ElementType) => {
    return {
      padding: '40px 20px',
      backgroundColor: '#ffffff',
      textColor: '#1a1a1a',
      fontSize: '16px',
      fontFamily: 'Inter, sans-serif',
      textAlign: 'center',
      maxWidth: '1200px',
      margin: '0 auto',
    };
  };

  const removeElement = (id: string) => {
    const newPage = currentPage.filter(el => el.id !== id);
    setCurrentPage(newPage);
    saveToHistory(newPage);
    if (selectedElement === id) setSelectedElement(null);
    
    toast({
      title: "Element Removed",
      description: "The element has been deleted",
    });
  };

  const duplicateElement = (id: string) => {
    const element = currentPage.find(el => el.id === id);
    if (!element) return;
    
    const newElement = {
      ...element,
      id: `element-${Date.now()}`,
      name: `${element.name} (Copy)`
    };
    
    const index = currentPage.findIndex(el => el.id === id);
    const newPage = [...currentPage];
    newPage.splice(index + 1, 0, newElement);
    
    setCurrentPage(newPage);
    saveToHistory(newPage);
    setSelectedElement(newElement.id);
  };

  const moveElement = (id: string, direction: 'up' | 'down') => {
    const index = currentPage.findIndex(el => el.id === id);
    if (index === -1) return;
    
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === currentPage.length - 1) return;
    
    const newPage = [...currentPage];
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    [newPage[index], newPage[newIndex]] = [newPage[newIndex], newPage[index]];
    
    setCurrentPage(newPage);
    saveToHistory(newPage);
  };

  const saveToHistory = (page: PageElement[]) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(JSON.parse(JSON.stringify(page)));
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  const undo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      setCurrentPage(JSON.parse(JSON.stringify(history[historyIndex - 1])));
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      setCurrentPage(JSON.parse(JSON.stringify(history[historyIndex + 1])));
    }
  };

  const loadTemplate = (template: PageTemplate) => {
    // In a real implementation, this would load the actual template elements
    toast({
      title: "Template Loaded",
      description: `${template.name} template applied to your page`,
    });
    setActiveTab('elements');
  };

  const getElementIcon = (type: ElementType) => {
    const icons: Record<ElementType, JSX.Element> = {
      header: <LayoutTemplate size={16} />,
      hero: <Monitor size={16} />,
      text: <Type size={16} />,
      image: <ImageIcon size={16} />,
      video: <Video size={16} />,
      button: <MousePointer size={16} />,
      form: <FormInput size={16} />,
      testimonial: <Star size={16} />,
      pricing: <DollarSign size={16} />,
      faq: <CheckSquare size={16} />,
      footer: <Columns size={16} />,
      navbar: <Globe size={16} />,
      'feature-grid': <Layers size={16} />,
      stats: <BarChart3 size={16} />,
      cta: <Zap size={16} />,
      gallery: <Grid3X3 size={16} />,
      map: <MapPin size={16} />,
      'social-proof': <Users size={16} />,
      countdown: <Clock size={16} />,
      embed: <Code size={16} />,
    };
    return icons[type] || <LayoutTemplate size={16} />;
  };

  const renderElementPreview = (element: PageElement) => {
    const isSelected = selectedElement === element.id;
    
    return (
      <div
        key={element.id}
        className={`relative p-4 mb-4 border-2 rounded-lg cursor-pointer transition-all ${
          isSelected 
            ? 'border-blue-500 bg-blue-50 shadow-lg' 
            : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
        }`}
        onClick={() => setSelectedElement(element.id)}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            {getElementIcon(element.type)}
            <span className="font-medium text-sm">{element.name}</span>
          </div>
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={(e) => { e.stopPropagation(); moveElement(element.id, 'up'); }}
            >
              <Move size={12} className="rotate-180" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={(e) => { e.stopPropagation(); moveElement(element.id, 'down'); }}
            >
              <Move size={12} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={(e) => { e.stopPropagation(); duplicateElement(element.id); }}
            >
              <Copy size={12} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-red-500 hover:text-red-700"
              onClick={(e) => { e.stopPropagation(); removeElement(element.id); }}
            >
              <Trash2 size={12} />
            </Button>
          </div>
        </div>
        
        {/* Mini preview of element content */}
        <div className="text-xs text-gray-500 truncate">
          {element.type === 'hero' && element.content.headline}
          {element.type === 'form' && `${element.content.fields.length} fields`}
          {element.type === 'pricing' && `${element.content.plans.length} plans`}
          {element.type === 'testimonial' && `"${element.content.quote.substring(0, 50)}..."`}
        </div>
        
        {isSelected && (
          <div className="absolute top-0 left-0 w-full h-full border-2 border-blue-500 rounded-lg pointer-events-none" />
        )}
      </div>
    );
  };

  const renderElementEditor = () => {
    if (!selectedElement) {
      return (
        <div className="p-4 text-center text-gray-500">
          <Layers className="mx-auto mb-2 h-8 w-8 opacity-50" />
          <p>Select an element to edit its properties</p>
        </div>
      );
    }

    const element = currentPage.find(el => el.id === selectedElement);
    if (!element) return null;

    return (
      <ScrollArea className="h-full">
        <div className="p-4 space-y-4">
          <div>
            <Label htmlFor="element-name">Element Name</Label>
            <Input
              id="element-name"
              value={element.name}
              onChange={(e) => {
                const updated = currentPage.map(el =>
                  el.id === selectedElement ? { ...el, name: e.target.value } : el
                );
                setCurrentPage(updated);
              }}
            />
          </div>

          {/* Content Editor based on element type */}
          {element.type === 'hero' && (
            <>
              <div>
                <Label htmlFor="headline">Headline</Label>
                <Input
                  id="headline"
                  value={element.content.headline}
                  onChange={(e) => {
                    const updated = currentPage.map(el =>
                      el.id === selectedElement 
                        ? { ...el, content: { ...el.content, headline: e.target.value } }
                        : el
                    );
                    setCurrentPage(updated);
                  }}
                />
              </div>
              <div>
                <Label htmlFor="subheadline">Subheadline</Label>
                <Input
                  id="subheadline"
                  value={element.content.subheadline}
                  onChange={(e) => {
                    const updated = currentPage.map(el =>
                      el.id === selectedElement 
                        ? { ...el, content: { ...el.content, subheadline: e.target.value } }
                        : el
                    );
                    setCurrentPage(updated);
                  }}
                />
              </div>
              <div>
                <Label htmlFor="cta-text">CTA Text</Label>
                <Input
                  id="cta-text"
                  value={element.content.ctaText}
                  onChange={(e) => {
                    const updated = currentPage.map(el =>
                      el.id === selectedElement 
                        ? { ...el, content: { ...el.content, ctaText: e.target.value } }
                        : el
                    );
                    setCurrentPage(updated);
                  }}
                />
              </div>
            </>
          )}

          {element.type === 'form' && (
            <>
              <div>
                <Label htmlFor="form-title">Form Title</Label>
                <Input
                  id="form-title"
                  value={element.content.title}
                  onChange={(e) => {
                    const updated = currentPage.map(el =>
                      el.id === selectedElement 
                        ? { ...el, content: { ...el.content, title: e.target.value } }
                        : el
                    );
                    setCurrentPage(updated);
                  }}
                />
              </div>
              <div>
                <Label>Form Fields</Label>
                <div className="space-y-2 mt-2">
                  {element.content.fields.map((field: any, idx: number) => (
                    <Card key={field.id} className="p-2">
                      <div className="flex items-center gap-2">
                        <Input
                          value={field.label}
                          onChange={(e) => {
                            const updatedFields = [...element.content.fields];
                            updatedFields[idx].label = e.target.value;
                            const updated = currentPage.map(el =>
                              el.id === selectedElement 
                                ? { ...el, content: { ...el.content, fields: updatedFields } }
                                : el
                            );
                            setCurrentPage(updated);
                          }}
                          className="flex-1"
                        />
                        <Switch
                          checked={field.required}
                          onCheckedChange={(checked) => {
                            const updatedFields = [...element.content.fields];
                            updatedFields[idx].required = checked;
                            const updated = currentPage.map(el =>
                              el.id === selectedElement 
                                ? { ...el, content: { ...el.content, fields: updatedFields } }
                                : el
                            );
                            setCurrentPage(updated);
                          }}
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => {
                            const updatedFields = element.content.fields.filter((_: any, i: number) => i !== idx);
                            const updated = currentPage.map(el =>
                              el.id === selectedElement 
                                ? { ...el, content: { ...el.content, fields: updatedFields } }
                                : el
                            );
                            setCurrentPage(updated);
                          }}
                        >
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    </Card>
                  ))}
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => {
                      const newField = {
                        id: `field-${Date.now()}`,
                        type: 'text',
                        label: 'New Field',
                        required: false
                      };
                      const updated = currentPage.map(el =>
                        el.id === selectedElement 
                          ? { ...el, content: { ...el.content, fields: [...el.content.fields, newField] } }
                          : el
                      );
                      setCurrentPage(updated);
                    }}
                  >
                    <Plus size={14} className="mr-2" /> Add Field
                  </Button>
                </div>
              </div>
            </>
          )}

          {/* Styles Editor */}
          <div className="pt-4 border-t">
            <h4 className="font-semibold mb-3 flex items-center gap-2">
              <Palette size={16} /> Styles
            </h4>
            
            <div className="space-y-3">
              <div>
                <Label htmlFor="bg-color">Background Color</Label>
                <div className="flex gap-2">
                  <Input
                    id="bg-color"
                    type="color"
                    value={element.styles.backgroundColor || '#ffffff'}
                    onChange={(e) => {
                      const updated = currentPage.map(el =>
                        el.id === selectedElement 
                          ? { ...el, styles: { ...el.styles, backgroundColor: e.target.value } }
                          : el
                      );
                      setCurrentPage(updated);
                    }}
                    className="w-20 h-10"
                  />
                  <Input
                    value={element.styles.backgroundColor || '#ffffff'}
                    onChange={(e) => {
                      const updated = currentPage.map(el =>
                        el.id === selectedElement 
                          ? { ...el, styles: { ...el.styles, backgroundColor: e.target.value } }
                          : el
                      );
                      setCurrentPage(updated);
                    }}
                    className="flex-1"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="padding">Padding</Label>
                <Input
                  id="padding"
                  value={element.styles.padding}
                  onChange={(e) => {
                    const updated = currentPage.map(el =>
                      el.id === selectedElement 
                        ? { ...el, styles: { ...el.styles, padding: e.target.value } }
                        : el
                    );
                    setCurrentPage(updated);
                  }}
                />
              </div>

              <div>
                <Label htmlFor="text-align">Text Alignment</Label>
                <Select
                  value={element.styles.textAlign}
                  onValueChange={(value) => {
                    const updated = currentPage.map(el =>
                      el.id === selectedElement 
                        ? { ...el, styles: { ...el.styles, textAlign: value } }
                        : el
                    );
                    setCurrentPage(updated);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="left">Left</SelectItem>
                    <SelectItem value="center">Center</SelectItem>
                    <SelectItem value="right">Right</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>
      </ScrollArea>
    );
  };

  return (
    <div className="h-screen flex flex-col bg-white">
      {/* Top Toolbar */}
      <div className="h-14 border-b flex items-center justify-between px-4 bg-white">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <LayoutTemplate className="h-5 w-5 text-blue-600" />
            <span className="font-semibold">Landing Page Builder</span>
          </div>
          
          <div className="h-6 w-px bg-gray-200" />
          
          <Input
            value={pageSettings.title}
            onChange={(e) => setPageSettings({ ...pageSettings, title: e.target.value })}
            className="w-64 h-8"
          />
          
          <Badge variant="secondary" className="ml-2">
            Draft
          </Badge>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={undo} disabled={historyIndex <= 0}>
            <Undo size={18} />
          </Button>
          <Button variant="ghost" size="icon" onClick={redo} disabled={historyIndex >= history.length - 1}>
            <Redo size={18} />
          </Button>
          
          <div className="h-6 w-px bg-gray-200 mx-2" />
          
          <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
            <Button
              variant={previewMode === 'desktop' ? 'secondary' : 'ghost'}
              size="icon"
              className="h-7 w-7"
              onClick={() => setPreviewMode('desktop')}
            >
              <Monitor size={14} />
            </Button>
            <Button
              variant={previewMode === 'tablet' ? 'secondary' : 'ghost'}
              size="icon"
              className="h-7 w-7"
              onClick={() => setPreviewMode('tablet')}
            >
              <Tablet size={14} />
            </Button>
            <Button
              variant={previewMode === 'mobile' ? 'secondary' : 'ghost'}
              size="icon"
              className="h-7 w-7"
              onClick={() => setPreviewMode('mobile')}
            >
              <Smartphone size={14} />
            </Button>
          </div>

          <div className="h-6 w-px bg-gray-200 mx-2" />
          
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setPreviewMode(previewMode === 'desktop' ? 'mobile' : 'desktop')}>
              <Eye size={14} className="mr-2" /> Preview
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowSettings(true)}>
              <Settings size={14} className="mr-2" /> Settings
            </Button>
            <Button size="sm">
              <Save size={14} className="mr-2" /> Save
            </Button>
            <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
              <Play size={14} className="mr-2" /> Publish
            </Button>
          </div>
        </div>
      </div>

      {/* Main Workspace */}
      <ResizablePanelGroup direction="horizontal" className="flex-1">
        {/* Left Sidebar - Elements & Templates */}
        <ResizablePanel defaultSize={20} minSize={15} maxSize={30}>
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="h-full flex flex-col">
            <TabsList className="w-full justify-start rounded-none border-b h-12">
              <TabsTrigger value="elements" className="flex-1">Elements</TabsTrigger>
              <TabsTrigger value="templates" className="flex-1">Templates</TabsTrigger>
              <TabsTrigger value="layers" className="flex-1">Layers</TabsTrigger>
            </TabsList>
            
            <TabsContent value="elements" className="flex-1 m-0">
              <ScrollArea className="h-[calc(100vh-180px)]">
                <div className="p-4 space-y-4">
                  {elementLibrary.map((category) => (
                    <div key={category.category}>
                      <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">
                        {category.category}
                      </h4>
                      <div className="grid grid-cols-2 gap-2">
                        {category.elements.map((el) => (
                          <Button
                            key={el.type}
                            variant="outline"
                            className="h-auto py-3 flex flex-col items-center gap-1 hover:bg-blue-50 hover:border-blue-300"
                            onClick={() => addElement(el.type as ElementType)}
                          >
                            {el.icon}
                            <span className="text-xs">{el.name}</span>
                          </Button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="templates" className="flex-1 m-0">
              <ScrollArea className="h-[calc(100vh-180px)]">
                <div className="p-4 space-y-3">
                  <div className="mb-4">
                    <Label className="text-xs text-gray-500">Filter by Category</Label>
                    <Select>
                      <SelectTrigger className="h-8 mt-1">
                        <SelectValue placeholder="All categories" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Categories</SelectItem>
                        <SelectItem value="conversion">Conversion</SelectItem>
                        <SelectItem value="events">Events</SelectItem>
                        <SelectItem value="product">Product</SelectItem>
                        <SelectItem value="b2b">B2B</SelectItem>
                        <SelectItem value="content">Content</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {templates.map((template) => (
                    <Card 
                      key={template.id} 
                      className="cursor-pointer hover:shadow-lg transition-shadow"
                      onClick={() => loadTemplate(template)}
                    >
                      <div className="aspect-video bg-gray-100 rounded-t-lg flex items-center justify-center">
                        <LayoutTemplate className="h-8 w-8 text-gray-300" />
                      </div>
                      <CardContent className="p-3">
                        <h4 className="font-medium text-sm">{template.name}</h4>
                        <div className="flex items-center justify-between mt-2">
                          <Badge variant="secondary" className="text-xs">
                            {template.category}
                          </Badge>
                          {template.conversionRate && (
                            <span className="text-xs text-green-600 font-medium">
                              {template.conversionRate}% conv.
                            </span>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="layers" className="flex-1 m-0">
              <ScrollArea className="h-[calc(100vh-180px)]">
                <div className="p-4">
                  {currentPage.length === 0 ? (
                    <div className="text-center text-gray-500 py-8">
                      <Layers className="mx-auto mb-2 h-8 w-8 opacity-50" />
                      <p className="text-sm">No elements yet</p>
                      <p className="text-xs mt-1">Add elements from the Elements tab</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {[...currentPage].reverse().map((element, idx) => (
                        <div
                          key={element.id}
                          className={`flex items-center gap-2 p-2 rounded border cursor-pointer ${
                            selectedElement === element.id 
                              ? 'bg-blue-50 border-blue-300' 
                              : 'hover:bg-gray-50 border-gray-200'
                          }`}
                          onClick={() => setSelectedElement(element.id)}
                        >
                          {getElementIcon(element.type)}
                          <span className="text-sm flex-1 truncate">{element.name}</span>
                          <span className="text-xs text-gray-400">#{currentPage.length - idx}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </ResizablePanel>

        {/* Center Canvas */}
        <ResizablePanel defaultSize={60}>
          <div className="h-full bg-gray-100 overflow-auto p-8">
            <div 
              className={`mx-auto bg-white shadow-lg transition-all duration-300 ${
                previewMode === 'desktop' ? 'max-w-6xl' :
                previewMode === 'tablet' ? 'max-w-3xl' :
                'max-w-sm'
              }`}
              style={{ 
                minHeight: '800px',
                transform: `scale(${zoomLevel / 100})`,
                transformOrigin: 'top center'
              }}
            >
              {currentPage.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-gray-400 py-32">
                  <LayoutTemplate className="h-16 w-16 mb-4 opacity-50" />
                  <h3 className="text-lg font-medium mb-2">Start Building Your Landing Page</h3>
                  <p className="text-sm mb-4">Drag elements from the left panel or choose a template</p>
                  <Button onClick={() => setActiveTab('templates')}>
                    Browse Templates
                  </Button>
                </div>
              ) : (
                <div className="p-8">
                  {currentPage.map((element) => (
                    <div key={element.id} className="group relative">
                      {renderElementPreview(element)}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </ResizablePanel>

        {/* Right Sidebar - Properties */}
        <ResizablePanel defaultSize={20} minSize={15} maxSize={30}>
          <div className="h-full border-l bg-white">
            <div className="p-4 border-b">
              <h3 className="font-semibold flex items-center gap-2">
                <Settings size={16} /> Properties
              </h3>
            </div>
            {renderElementEditor()}
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>

      {/* Page Settings Dialog */}
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Page Settings</DialogTitle>
            <DialogDescription>
              Configure your landing page settings, SEO, and tracking
            </DialogDescription>
          </DialogHeader>
          
          <Tabs defaultValue="general" className="mt-4">
            <TabsList>
              <TabsTrigger value="general">General</TabsTrigger>
              <TabsTrigger value="seo">SEO</TabsTrigger>
              <TabsTrigger value="tracking">Tracking</TabsTrigger>
              <TabsTrigger value="advanced">Advanced</TabsTrigger>
            </TabsList>
            
            <TabsContent value="general" className="space-y-4 mt-4">
              <div>
                <Label htmlFor="page-title">Page Title</Label>
                <Input
                  id="page-title"
                  value={pageSettings.title}
                  onChange={(e) => setPageSettings({ ...pageSettings, title: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="page-slug">URL Slug</Label>
                <div className="flex items-center gap-2">
                  <span className="text-gray-500">cadence.com/</span>
                  <Input
                    id="page-slug"
                    value={pageSettings.slug}
                    onChange={(e) => setPageSettings({ ...pageSettings, slug: e.target.value })}
                    className="flex-1"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="meta-desc">Meta Description</Label>
                <textarea
                  id="meta-desc"
                  value={pageSettings.metaDescription}
                  onChange={(e) => setPageSettings({ ...pageSettings, metaDescription: e.target.value })}
                  className="w-full h-24 p-2 border rounded-md resize-none"
                  placeholder="Brief description for search engines..."
                />
                <p className="text-xs text-gray-500 mt-1">
                  {pageSettings.metaDescription.length}/160 characters
                </p>
              </div>
            </TabsContent>
            
            <TabsContent value="seo" className="space-y-4 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <TrendingUp size={16} /> SEO Score
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4">
                    <div className="relative h-20 w-20">
                      <svg className="h-full w-full" viewBox="0 0 36 36">
                        <path
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                          fill="none"
                          stroke="#e5e7eb"
                          strokeWidth="3"
                        />
                        <path
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                          fill="none"
                          stroke="#22c55e"
                          strokeWidth="3"
                          strokeDasharray={`${pageSettings.seoScore}, 100`}
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-lg font-bold">{pageSettings.seoScore}</span>
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <CheckSquare size={14} className="text-green-500" />
                          <span className="text-sm">Title tag optimized</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckSquare size={14} className="text-green-500" />
                          <span className="text-sm">Meta description present</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckSquare size={14} className="text-yellow-500" />
                          <span className="text-sm">Add alt text to images</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckSquare size={14} className="text-gray-300" />
                          <span className="text-sm">Internal linking</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="tracking" className="space-y-4 mt-4">
              <div>
                <Label>Tracking Scripts</Label>
                <div className="space-y-2 mt-2">
                  <Card className="p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <img src="/google-analytics.svg" alt="GA" className="h-6 w-6" />
                        <div>
                          <p className="font-medium text-sm">Google Analytics</p>
                          <p className="text-xs text-gray-500">Not connected</p>
                        </div>
                      </div>
                      <Button variant="outline" size="sm">Connect</Button>
                    </div>
                  </Card>
                  <Card className="p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <img src="/facebook-pixel.svg" alt="FB" className="h-6 w-6" />
                        <div>
                          <p className="font-medium text-sm">Facebook Pixel</p>
                          <p className="text-xs text-gray-500">Not connected</p>
                        </div>
                      </div>
                      <Button variant="outline" size="sm">Connect</Button>
                    </div>
                  </Card>
                  <Card className="p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <img src="/linkedin.svg" alt="LI" className="h-6 w-6" />
                        <div>
                          <p className="font-medium text-sm">LinkedIn Insight Tag</p>
                          <p className="text-xs text-gray-500">Not connected</p>
                        </div>
                      </div>
                      <Button variant="outline" size="sm">Connect</Button>
                    </div>
                  </Card>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="advanced" className="space-y-4 mt-4">
              <div>
                <Label htmlFor="custom-code">Custom HTML/CSS/JS</Label>
                <textarea
                  id="custom-code"
                  value={pageSettings.customCode}
                  onChange={(e) => setPageSettings({ ...pageSettings, customCode: e.target.value })}
                  className="w-full h-48 p-2 border rounded-md font-mono text-sm"
                  placeholder="<style>/* Your custom CSS */</style>
<script>/* Your custom JavaScript */</script>"
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Enable A/B Testing</Label>
                  <p className="text-xs text-gray-500">Create variants to test conversions</p>
                </div>
                <Switch />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Mobile Optimization</Label>
                  <p className="text-xs text-gray-500">Auto-optimize for mobile devices</p>
                </div>
                <Switch defaultChecked />
              </div>
            </TabsContent>
          </Tabs>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSettings(false)}>Cancel</Button>
            <Button onClick={() => setShowSettings(false)}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LandingPageBuilder;
