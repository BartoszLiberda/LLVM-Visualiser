import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { getBadgeColorFromHash } from "@/lib/utils"

interface MemoryTableProps {
    memory: Record<string, number>
    registers: Record<string, number>
}

export default function MemoryView({ memory, registers }: MemoryTableProps) {
    const data = Object.entries(memory).map(([address, value]) => ({
        memoryAddress: address,
        value
    }))

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
                            data.map((row) => (
                                <TableRow key={row.memoryAddress}>
                                    <TableCell className="w-1/2 flex items-center gap-2 font-mono font-medium">
                                        <Badge variant="outline" className={`text-[10px] px-1 py-0 border-transparent ${Object.values(registers).includes(parseInt(row.memoryAddress)) ? getBadgeColorFromHash(parseInt(row.memoryAddress).toString(16)) : 'invisible'}`}>
                                            PTR
                                        </Badge>
                                        0x{parseInt(row.memoryAddress).toString(16)}
                                    </TableCell>
                                    <TableCell className="w-1/2 font-mono">
                                        {row.value}
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </ScrollArea>
        </div>
    )
}