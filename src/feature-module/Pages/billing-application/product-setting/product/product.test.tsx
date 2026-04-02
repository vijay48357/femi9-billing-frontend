// /**
//  * @fileoverview Product component unit tests
//  * @description Billing application → Product Settings → Product page-க்கான
//  *               unit test suite.
//  *
//  * @module Product.test
//  * @requires @testing-library/react
//  * @requires @testing-library/user-event
//  * @requires react-router-dom
//  *
//  * Test Groups:
//  *  - Group 1: Page Render          — அனைத்து UI elements render ஆகிறதா
//  *  - Group 2: Goods/Service Toggle — toggle state சரியாக மாறுகிறதா
//  *  - Group 3: Single/Variants      — variant mode UI சரியாக காட்டுகிறதா
//  *  - Group 4: Save Validation      — form validation + sessionStorage
//  *  - Group 5: Track Inventory      — checkbox conditional render
//  *  - Group 6: Returnable Radio     — radio button state
//  *  - Group 7: Add Identifier       — identifier section toggle
//  *  - Group 8: Variants Attributes  — dynamic attribute rows
//  */

// import React from 'react';
// import { render, screen } from '@testing-library/react';
// import userEvent from '@testing-library/user-event';
// import { MemoryRouter } from 'react-router-dom';
// import Product from './product';

// // ════════════════════════════════════════════════════════════════
// //  MOCKS
// // ════════════════════════════════════════════════════════════════

// /**
//  * @description 
//  */
// jest.mock('@components/footer/footer', () => ({
//   __esModule: true,
//   default: () => null,
// }));

// jest.mock('../../../../../../components/page-header/pageHeader', () => ({
//   __esModule: true,
//   default: () => null,
// }));

// jest.mock('../../../settings/settings-topbar/settingsTopbar', () => ({
//   __esModule: true,
//   default: () => null,
// }));

// jest.mock('../../../../../../routes/all_routes', () => ({
//   __esModule: true,
//   all_routes: {},
// }));

// /** @description useNavigate mock — navigation calls verify செய்ய */
// const mockNavigate = jest.fn();
// jest.mock('react-router-dom', () => ({
//   ...jest.requireActual('react-router-dom'),
//   useNavigate: () => mockNavigate,
// }));

// // ════════════════════════════════════════════════════════════════
// //  GLOBAL SETUP
// // ════════════════════════════════════════════════════════════════

// /**
//  * @description Bootstrap Modal + Blob URL — component internally use செய்யும்.
//  */
// beforeAll(() => {
//   (window as any).bootstrap = {
//     Modal: class {
//       show() {}
//       hide() {}
//       static getInstance() {
//         return { hide: jest.fn() };
//       }
//     },
//   };
//   global.URL.createObjectURL = jest.fn(() => 'blob:mock-url');
// });

// /** @description ஒவ்வொரு test முன்பும் state clean செய்கிறோம் */
// beforeEach(() => {
//   sessionStorage.clear();
//   mockNavigate.mockClear();
// });

// // ════════════════════════════════════════════════════════════════
// //  HELPER
// // ════════════════════════════════════════════════════════════════

// /**
//  * Product component-ஐ MemoryRouter-உடன் render செய்யும் helper.
//  * @returns {RenderResult} RTL render result
//  */
// const renderProduct = () =>
//   render(
//     <MemoryRouter>
//       <Product />
//     </MemoryRouter>
//   );

// // ════════════════════════════════════════════════════════════════
// //  GROUP 1: Page Render
// // ════════════════════════════════════════════════════════════════

// /**
//  * @group Page Render
//  * @description Component mount ஆகும்போது அனைத்து primary UI elements
//  *              DOM-ல் present ஆகிறதா என்று verify செய்கிறோம்.
//  */
// describe('Page Render', () => {

//   /** @test Product heading visible */
//   test('Product heading தெரிய வேண்டும்', () => {
//     renderProduct();
//     expect(screen.getByText('Product')).toBeInTheDocument();
//   });

//   /** @test Goods / Service toggle buttons visible */
//   test('Goods / Service buttons தெரிய வேண்டும்', () => {
//     renderProduct();
//     expect(screen.getByRole('button', { name: /Goods/i })).toBeInTheDocument();
//     expect(screen.getByRole('button', { name: /Service/i })).toBeInTheDocument();
//   });

//   /** @test Single Item / Contains Variants toggle buttons visible */
//   test('Single Item / Contains Variants buttons தெரிய வேண்டும்', () => {
//     renderProduct();
//     expect(screen.getByRole('button', { name: /Single Item/i })).toBeInTheDocument();
//     expect(screen.getByRole('button', { name: /Contains Variants/i })).toBeInTheDocument();
//   });

//   /** @test Save and Cancel action buttons visible */
//   test('Save / Cancel buttons தெரிய வேண்டும்', () => {
//     renderProduct();
//     expect(screen.getByRole('button', { name: /^Save$/i })).toBeInTheDocument();
//     expect(screen.getByRole('button', { name: /^Cancel$/i })).toBeInTheDocument();
//   });

//   /** @test Item Details section heading visible */
//   test('Item Details section தெரிய வேண்டும்', () => {
//     renderProduct();
//     expect(screen.getByText('Item Details')).toBeInTheDocument();
//   });

//   /** @test Sales Information section visible */
//   test('Sales Information தெரிய வேண்டும்', () => {
//     renderProduct();
//     expect(screen.getByText('Sales Information')).toBeInTheDocument();
//   });

//   /** @test Purchase Information section visible */
//   test('Purchase Information தெரிய வேண்டும்', () => {
//     renderProduct();
//     expect(screen.getByText('Purchase Information')).toBeInTheDocument();
//   });

//   /** @test Track Inventory label visible */
//   test('Track Inventory label தெரிய வேண்டும்', () => {
//     renderProduct();
//     expect(screen.getByText(/Track Inventory for this item/i)).toBeInTheDocument();
//   });

//   /** @test Cancellation and Returns section visible */
//   test('Cancellation and Returns section தெரிய வேண்டும்', () => {
//     renderProduct();
//     expect(screen.getByText('Cancellation and Returns')).toBeInTheDocument();
//   });

//   /** @test Yes / No returnable radio buttons visible */
//   test('Yes / No radio buttons தெரிய வேண்டும்', () => {
//     renderProduct();
//     expect(screen.getByLabelText('Yes')).toBeInTheDocument();
//     expect(screen.getByLabelText('No')).toBeInTheDocument();
//   });
// });

// // ════════════════════════════════════════════════════════════════
// //  GROUP 2: Goods / Service Toggle
// // ════════════════════════════════════════════════════════════════

// /**
//  * @group Goods/Service Toggle
//  * @description Product type toggle — Goods அல்லது Service select செய்யும்போது
//  *              CSS class சரியாக apply ஆகிறதா என்று verify செய்கிறோம்.
//  */
// describe('Goods / Service Toggle', () => {

//   /** @test Initial state — Goods selected */
//   test('Default: Goods selected', () => {
//     renderProduct();
//     expect(screen.getByRole('button', { name: /Goods/i }).className)
//       .toContain('btn-zoho-selected');
//   });

//   /** @test Service click → Service gets selected class */
//   test('Service click → Service selected', async () => {
//     renderProduct();
//     await userEvent.click(screen.getByRole('button', { name: /Service/i }));
//     expect(screen.getByRole('button', { name: /Service/i }).className)
//       .toContain('btn-zoho-selected');
//   });

//   /** @test Service click → Goods loses selected class */
//   test('Service click → Goods unselected', async () => {
//     renderProduct();
//     await userEvent.click(screen.getByRole('button', { name: /Service/i }));
//     expect(screen.getByRole('button', { name: /Goods/i }).className)
//       .not.toContain('btn-zoho-selected');
//   });

//   /** @test Toggle back from Service to Goods */
//   test('Goods → Service → Goods toggle', async () => {
//     renderProduct();
//     await userEvent.click(screen.getByRole('button', { name: /Service/i }));
//     await userEvent.click(screen.getByRole('button', { name: /Goods/i }));
//     expect(screen.getByRole('button', { name: /Goods/i }).className)
//       .toContain('btn-zoho-selected');
//   });
// });

// // ════════════════════════════════════════════════════════════════
// //  GROUP 3: Single Item / Contains Variants Toggle
// // ════════════════════════════════════════════════════════════════

// /**
//  * @group Single Item / Variants Toggle
//  * @description Variant mode ON/OFF — conditional sections
//  *              (Product Image, Fulfilment Details, Variations) சரியாக
//  *              show/hide ஆகிறதா என்று verify செய்கிறோம்.
//  */
// describe('Single Item / Contains Variants Toggle', () => {

//   /** @test Initial state — Single Item selected */
//   test('Default: Single Item selected', () => {
//     renderProduct();
//     expect(screen.getByRole('button', { name: /Single Item/i }).className)
//       .toContain('btn-zoho-selected');
//   });

//   /** @test Single mode — Product Image section visible */
//   test('Default: Product Image section காட்ட வேண்டும்', () => {
//     renderProduct();
//     expect(screen.getByText('Product Image')).toBeInTheDocument();
//   });

//   /** @test Single mode — Fulfilment Details visible */
//   test('Default: Fulfilment Details காட்ட வேண்டும்', () => {
//     renderProduct();
//     expect(screen.getByText('Fulfilment Details')).toBeInTheDocument();
//   });

//   /** @test Single mode — Selling Price visible */
//   test('Default: Selling Price காட்ட வேண்டும்', () => {
//     renderProduct();
//     expect(screen.getByText(/Selling Price/i)).toBeInTheDocument();
//   });

//   /** @test Variant mode — Variations section appears */
//   test('Contains Variants → Variations section காட்ட வேண்டும்', async () => {
//     renderProduct();
//     await userEvent.click(screen.getByRole('button', { name: /Contains Variants/i }));
//     expect(screen.getByText('Variations')).toBeInTheDocument();
//   });

//   /** @test Variant mode — Attribute input placeholder visible */
//   test('Contains Variants → Attribute input காட்ட வேண்டும்', async () => {
//     renderProduct();
//     await userEvent.click(screen.getByRole('button', { name: /Contains Variants/i }));
//     expect(screen.getByPlaceholderText('eg: color')).toBeInTheDocument();
//   });

//   /** @test Variant mode — Product Image hidden */
//   test('Contains Variants → Product Image மறைய வேண்டும்', async () => {
//     renderProduct();
//     await userEvent.click(screen.getByRole('button', { name: /Contains Variants/i }));
//     expect(screen.queryByText('Product Image')).not.toBeInTheDocument();
//   });

//   /** @test Variant mode — Fulfilment Details hidden */
//   test('Contains Variants → Fulfilment Details மறைய வேண்டும்', async () => {
//     renderProduct();
//     await userEvent.click(screen.getByRole('button', { name: /Contains Variants/i }));
//     expect(screen.queryByText('Fulfilment Details')).not.toBeInTheDocument();
//   });
// });

// // ════════════════════════════════════════════════════════════════
// //  GROUP 4: Save Button Validation
// // ════════════════════════════════════════════════════════════════

// /**
//  * @group Save Button Validation
//  * @description Form submit validation — name required check,
//  *              sessionStorage persistence, navigate(-1) call verify செய்கிறோம்.
//  */
// describe('Save Button Validation', () => {

//   /**
//    * @test Empty name → alert shown
//    * @description Product name இல்லாமல் save செய்தால் validation alert வர வேண்டும்.
//    */
//   test('Name இல்லாமல் Save → alert வர வேண்டும்', async () => {
//     renderProduct();
//     const spy = jest.spyOn(window, 'alert').mockImplementation(() => {});
//     await userEvent.click(screen.getByRole('button', { name: /^Save$/i }));
//     expect(spy).toHaveBeenCalledWith('Please enter a product name.');
//     spy.mockRestore();
//   });

//   /** @test Empty name → sessionStorage unchanged */
//   test('Name இல்லாமல் Save → sessionStorage empty', async () => {
//     renderProduct();
//     jest.spyOn(window, 'alert').mockImplementation(() => {});
//     await userEvent.click(screen.getByRole('button', { name: /^Save$/i }));
//     expect(sessionStorage.getItem('savedProducts')).toBeNull();
//   });

//   /** @test Valid name → product saved to sessionStorage */
//   test('Name type → Save → sessionStorage-ல் save ஆக வேண்டும்', async () => {
//     renderProduct();
//     await userEvent.type(screen.getAllByRole('textbox')[0], 'My Product');
//     await userEvent.click(screen.getByRole('button', { name: /^Save$/i }));
//     const saved = JSON.parse(sessionStorage.getItem('savedProducts') || '[]');
//     expect(saved[0].name).toBe('My Product');
//   });

//   /** @test Saved product has status: "active" */
//   test('Save → status: "active" இருக்க வேண்டும்', async () => {
//     renderProduct();
//     await userEvent.type(screen.getAllByRole('textbox')[0], 'Test');
//     await userEvent.click(screen.getByRole('button', { name: /^Save$/i }));
//     const saved = JSON.parse(sessionStorage.getItem('savedProducts') || '[]');
//     expect(saved[0].status).toBe('active');
//   });

//   /** @test Single Item mode → isSingle: true in storage */
//   test('Single Item save → isSingle: true', async () => {
//     renderProduct();
//     await userEvent.type(screen.getAllByRole('textbox')[0], 'Single');
//     await userEvent.click(screen.getByRole('button', { name: /^Save$/i }));
//     const saved = JSON.parse(sessionStorage.getItem('savedProducts') || '[]');
//     expect(saved[0].isSingle).toBe(true);
//   });

//   /** @test Variants mode → isSingle: false in storage */
//   test('Contains Variants save → isSingle: false', async () => {
//     renderProduct();
//     await userEvent.click(screen.getByRole('button', { name: /Contains Variants/i }));
//     await userEvent.type(screen.getAllByRole('textbox')[0], 'Variant');
//     await userEvent.click(screen.getByRole('button', { name: /^Save$/i }));
//     const saved = JSON.parse(sessionStorage.getItem('savedProducts') || '[]');
//     expect(saved[0].isSingle).toBe(false);
//   });

//   /** @test Whitespace-only name → validation alert shown */
//   test('Spaces மட்டும் name → alert வர வேண்டும்', async () => {
//     renderProduct();
//     const spy = jest.spyOn(window, 'alert').mockImplementation(() => {});
//     await userEvent.type(screen.getAllByRole('textbox')[0], '   ');
//     await userEvent.click(screen.getByRole('button', { name: /^Save$/i }));
//     expect(spy).toHaveBeenCalled();
//     spy.mockRestore();
//   });

//   /** @test Valid save → navigate(-1) called */
//   test('Save → navigate(-1) call ஆக வேண்டும்', async () => {
//     renderProduct();
//     await userEvent.type(screen.getAllByRole('textbox')[0], 'Nav Test');
//     await userEvent.click(screen.getByRole('button', { name: /^Save$/i }));
//     expect(mockNavigate).toHaveBeenCalledWith(-1);
//   });

//   /** @test Cancel → navigate(-1) called */
//   test('Cancel → navigate(-1) call ஆக வேண்டும்', async () => {
//     renderProduct();
//     await userEvent.click(screen.getByRole('button', { name: /^Cancel$/i }));
//     expect(mockNavigate).toHaveBeenCalledWith(-1);
//   });
// });

// // ════════════════════════════════════════════════════════════════
// //  GROUP 5: Track Inventory Checkbox
// // ════════════════════════════════════════════════════════════════

// /**
//  * @group Track Inventory Checkbox
//  * @description Inventory tracking checkbox — conditional "Inventory Account"
//  *              section show/hide verify செய்கிறோம்.
//  */
// describe('Track Inventory Checkbox', () => {

//   /** @test Default state — checkbox checked */
//   test('Default: checked', () => {
//     renderProduct();
//     expect(screen.getByRole('checkbox', { name: /Track Inventory/i })).toBeChecked();
//   });

//   /** @test Default state — Inventory Account section visible */
//   test('Default: Inventory Account தெரிய வேண்டும்', () => {
//     renderProduct();
//     expect(screen.getByText(/Inventory Account/i)).toBeInTheDocument();
//   });

//   /** @test Uncheck → Inventory Account section hidden */
//   test('Uncheck → Inventory Account மறைய வேண்டும்', async () => {
//     renderProduct();
//     await userEvent.click(screen.getByRole('checkbox', { name: /Track Inventory/i }));
//     expect(screen.queryByText(/Inventory Account/i)).not.toBeInTheDocument();
//   });

//   /** @test Uncheck then re-check → section reappears */
//   test('Uncheck → Check → மீண்டும் தெரிய வேண்டும்', async () => {
//     renderProduct();
//     const cb = screen.getByRole('checkbox', { name: /Track Inventory/i });
//     await userEvent.click(cb);
//     await userEvent.click(cb);
//     expect(screen.getByText(/Inventory Account/i)).toBeInTheDocument();
//   });
// });

// // ════════════════════════════════════════════════════════════════
// //  GROUP 6: Returnable Item Radio
// // ════════════════════════════════════════════════════════════════

// /**
//  * @group Returnable Item Radio
//  * @description Yes/No radio button state management verify செய்கிறோம்.
//  */
// describe('Returnable Item Radio', () => {

//   /** @test Default — Yes checked, No unchecked */
//   test('Default: Yes checked, No unchecked', () => {
//     renderProduct();
//     expect(screen.getByLabelText('Yes')).toBeChecked();
//     expect(screen.getByLabelText('No')).not.toBeChecked();
//   });

//   /** @test Click No → No becomes checked */
//   test('No click → No checked', async () => {
//     renderProduct();
//     await userEvent.click(screen.getByLabelText('No'));
//     expect(screen.getByLabelText('No')).toBeChecked();
//   });

//   /** @test No → Yes switch restores Yes */
//   test('No → Yes switch', async () => {
//     renderProduct();
//     await userEvent.click(screen.getByLabelText('No'));
//     await userEvent.click(screen.getByLabelText('Yes'));
//     expect(screen.getByLabelText('Yes')).toBeChecked();
//     expect(screen.getByLabelText('No')).not.toBeChecked();
//   });
// });

// // ════════════════════════════════════════════════════════════════
// //  GROUP 7: Add Identifier
// // ════════════════════════════════════════════════════════════════

// /**
//  * @group Add Identifier
//  * @description "Add Identifier" link click → UPC/EAN/MPN/ISBN fields
//  *              expand ஆகிறதா என்று verify செய்கிறோம்.
//  */
// describe('Add Identifier', () => {

//   /** @test Add Identifier link initially visible */
//   test('Link தெரிய வேண்டும்', () => {
//     renderProduct();
//     expect(screen.getByText(/Add Identifier/i)).toBeInTheDocument();
//   });

//   /** @test After click — UPC field visible */
//   test('Click → UPC தெரிய வேண்டும்', async () => {
//     renderProduct();
//     await userEvent.click(screen.getByText(/Add Identifier/i));
//     expect(screen.getByText('UPC')).toBeInTheDocument();
//   });

//   /** @test After click — EAN field visible */
//   test('Click → EAN தெரிய வேண்டும்', async () => {
//     renderProduct();
//     await userEvent.click(screen.getByText(/Add Identifier/i));
//     expect(screen.getByText('EAN')).toBeInTheDocument();
//   });

//   /** @test After click — MPN field visible */
//   test('Click → MPN தெரிய வேண்டும்', async () => {
//     renderProduct();
//     await userEvent.click(screen.getByText(/Add Identifier/i));
//     expect(screen.getByText('MPN')).toBeInTheDocument();
//   });

//   /** @test After click — ISBN field visible */
//   test('Click → ISBN தெரிய வேண்டும்', async () => {
//     renderProduct();
//     await userEvent.click(screen.getByText(/Add Identifier/i));
//     expect(screen.getByText('ISBN')).toBeInTheDocument();
//   });

//   /** @test After click — Add Identifier link itself hidden */
//   test('Click → link மறைய வேண்டும்', async () => {
//     renderProduct();
//     await userEvent.click(screen.getByText(/Add Identifier/i));
//     expect(screen.queryByText(/Add Identifier/i)).not.toBeInTheDocument();
//   });
// });

// // ════════════════════════════════════════════════════════════════
// //  GROUP 8: Contains Variants — Attributes
// // ════════════════════════════════════════════════════════════════

// /**
//  * @group Contains Variants — Attributes
//  * @description Dynamic attribute rows — add/remove, max 3 limit verify செய்கிறோம்.
//  */
// describe('Contains Variants — Attributes', () => {

//   /**
//    * Helper — Variants mode-க்கு switch செய்கிறோம்.
//    * @returns {Promise<void>}
//    */
//   const goVariants = async () =>
//     userEvent.click(screen.getByRole('button', { name: /Contains Variants/i }));

//   /** @test Variants mode — default attribute placeholder visible */
//   test('"eg: color" placeholder தெரிய வேண்டும்', async () => {
//     renderProduct();
//     await goVariants();
//     expect(screen.getByPlaceholderText('eg: color')).toBeInTheDocument();
//   });

//   /** @test Variants mode — Add more attributes link visible */
//   test('Add more attributes link தெரிய வேண்டும்', async () => {
//     renderProduct();
//     await goVariants();
//     expect(screen.getByText(/Add more attributes/i)).toBeInTheDocument();
//   });

//   /** @test Attribute input accepts text */
//   test('Attribute field-ல் type செய்யலாம்', async () => {
//     renderProduct();
//     await goVariants();
//     const input = screen.getByPlaceholderText('eg: color');
//     await userEvent.type(input, 'Size');
//     expect(input).toHaveValue('Size');
//   });

//   /** @test Add more attributes → 2 rows appear */
//   test('Add more attributes → 2 rows', async () => {
//     renderProduct();
//     await goVariants();
//     await userEvent.click(screen.getByText(/Add more attributes/i));
//     expect(screen.getAllByPlaceholderText('eg: color').length).toBe(2);
//   });

//   /**
//    * @test Max 3 attributes enforced
//    * @description 4번째 add click → still 3 rows மட்டுமே இருக்க வேண்டும்.
//    */
//   test('Max 3 attributes — 4th add ஆகக்கூடாது', async () => {
//     renderProduct();
//     await goVariants();
//     await userEvent.click(screen.getByText(/Add more attributes/i));
//     await userEvent.click(screen.getByText(/Add more attributes/i));
//     await userEvent.click(screen.getByText(/Add more attributes/i));
//     expect(screen.getAllByPlaceholderText('eg: color').length).toBe(3);
//   });
// });