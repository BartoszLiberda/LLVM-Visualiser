import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ScrollArea } from "@/components/ui/scroll-area"
import { getTextColorFromHash } from "@/lib/utils"

interface MemoryTableProps {
    memory: Record<string, number>
    registers: Record<string, number>
}

export default function MemoryView({ memory, registers }: MemoryTableProps) {
    const data = Object.entries(memory).map(([address, value]) => ({
        memoryAddress: address,
        value
    })).sort((a, b) => parseInt(a.memoryAddress) - parseInt(b.memoryAddress));

    const globalsData = data.filter(d => parseInt(d.memoryAddress) < 0x7000);
    const stackData = data.filter(d => parseInt(d.memoryAddress) >= 0x7000);

    return (
        <div className="flex flex-col h-full">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-1/2">Address</TableHead>
                        <TableHead className="w-1/2">Value</TableHead>
                    </TableRow>
                </TableHeader>
            </Table>
            <ScrollArea className="flex-1 min-h-0">
                <Table>
                    <TableBody>
                        {data.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={2} className="flex-1 min-h-0 text-center text-muted-foreground">
                                    Memory Empty
                                </TableCell>
                            </TableRow>
                        ) : (
                            <>
                                {globalsData.map((row) => (
                                    <TableRow key={row.memoryAddress} className="bg-muted/20 hover:bg-muted/40">
                                        <TableCell className={`w-1/2 font-mono font-medium ${Object.values(registers).includes(parseInt(row.memoryAddress)) ? getTextColorFromHash(parseInt(row.memoryAddress).toString(16)) : 'text-muted-foreground/80'}`}>
                                            0x{parseInt(row.memoryAddress).toString(16)}
                                        </TableCell>
                                        <TableCell className="w-1/2 font-mono text-muted-foreground/80">
                                            {row.value}
                                        </TableCell>
                                    </TableRow>
                                ))}
                                
                                {stackData.length > 0 && (
                                    <TableRow className="hover:bg-transparent">
                                        <TableCell colSpan={2} className="text-center font-mono text-[10px] text-muted-foreground/60 py-1.5 uppercase tracking-widest bg-muted/10 border-y">
                                            --- Stack Allocated ---
                                        </TableCell>
                                    </TableRow>
                                )}

                                {stackData.map((row) => (
                                    <TableRow key={row.memoryAddress}>
                                        <TableCell className={`w-1/2 font-mono font-medium ${Object.values(registers).includes(parseInt(row.memoryAddress)) ? getTextColorFromHash(parseInt(row.memoryAddress).toString(16)) : ''}`}>
                                            0x{parseInt(row.memoryAddress).toString(16)}
                                        </TableCell>
                                        <TableCell className="w-1/2 font-mono">
                                            {row.value}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </>
                        )}
                    </TableBody>
                </Table>
            </ScrollArea>
        </div>
    )
}