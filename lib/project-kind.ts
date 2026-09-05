type RecordLike={kindOverride?:string;category:string;name:string;description:string};
export const BUSINESS_KINDS:Record<string,string>={cafe:'Cafés',restaurant:'Restaurants',bar:'Bars & nightlife',retail:'Retail',cannabis:'Cannabis',health:'Health & clinics',childcare:'Childcare',fitness:'Fitness & wellness',hotel:'Hotels',office:'Offices',storage:'Storage',shops:'Other / mixed use'};
export function projectKind(p:RecordLike):string{
 if(p.kindOverride)return p.kindOverride;
 if(p.category==='Parks & recreation')return 'park';
 if(p.category==='Utilities & public works')return 'works';
 if(p.category==='Housing')return 'housing';
 if(p.category==='Streets & transit')return 'transit';
 if(p.category!=='Food & shops')return 'other';
 // Prefer the destination of a change of use over the previous tenant.
 let text=p.description.toLowerCase().replace(/from\b[^.;]{0,250}?\bto\b/g,'to');
 text=text.replace(/wet bar/g,'').replace(/formerly[^.;]*/g,'').replace(/previously[^.;]*/g,'');
 if(/child.?care|day.?care|preschool/.test(text))return 'childcare';
 if(/hospital|health clinic|health services|medical center/.test(text))return 'health';
 if(/self.storage/.test(text))return 'storage';
 if(/hotel|guest rooms/.test(text))return 'hotel';
 if(/cannabis/.test(text))return 'cannabis';
 if(/fitness|\bgym\b|bathhouse|sauna/.test(text))return 'fitness';
 if(/coffee|caf[eé]|espresso/.test(text))return 'cafe';
 if(/restaurant|outdoor dining|eating establishment/.test(text))return 'restaurant';
 if(/\bbar\b|nighttime entertainment|nightclub/.test(text))return 'bar';
 if(/(?:to|establish|new) (?:an? )?office|to (?:non.retail|non retail)/.test(text))return 'office';
 if(/retail store|bookstore|convenience store|retail sales|galleria|retail facility/.test(text))return 'retail';
 return 'shops';
}
export function kindLabel(p:RecordLike){const k=projectKind(p);return BUSINESS_KINDS[k]||p.category;}
