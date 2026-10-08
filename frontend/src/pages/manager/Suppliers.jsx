import { Table, Btn, S, Actions, PageHeader, FilterBar, Input, Select, Pager } from '../../components/kit';
const d = [['PetroSupply Co, Ltd.','John Smith','012-345-678','john@petrosupply.com','Net 30','Active'],['Global Fuel Solutions','Sarah Johnson','012-555-123','sarah@globalfuel.com','Net 15','Active'],
  ['FuelTech Suppliers','David Wilson','012-888-789','david@fueltech.com','Net 45','Inactive']];
export default function Suppliers() {
  return (<><PageHeader title="Suppliers" sub="Manage your fuel and product suppliers" action={<Btn v="gold">Add new supplier</Btn>} />
    <FilterBar><Input placeholder="Search supplier name, contact..." /><Select label="Status" options={['All','Active','Inactive']} /><Btn v="gold">Filter</Btn><Btn v="ghost">Reset</Btn></FilterBar>
    <Table head={['ID','Supplier','Contact','Phone','Email','Terms','Status','Action']} rows={d.map((r, i) => [`00${i + 1}`, ...r.slice(0, 5), S(r[5]), <Actions key={i} />])} /><Pager /></>);
}
